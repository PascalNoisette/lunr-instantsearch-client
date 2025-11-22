import type {
    LegacySearchMethodProps,
    SearchForFacetValuesResponse,
    SearchClient,
    SearchMethodParams,
    SearchResponse,
    SearchResponses,
    FacetHits,
} from '@algolia/client-search';
import type { LunrFacetsCounts, LunrSearchWorkerInterface } from './types';
import { measureTime } from './decorators/timeDecorator';


/**
 * Implementation of SearchClient compatible with InstantSearch.
 * Relay searches to the correct worker (one worker per index).
 */
export default class LunrSearchClient implements Partial<SearchClient> {
    private workers: { [indexName: string]: LunrSearchWorkerInterface };
    private plugins: <T, U>(fn: (t: T) => Promise<U>) => (t: T) => Promise<U>;

    constructor(workers: { [indexName: string]: LunrSearchWorkerInterface }, plugins: <T, U>(fn: (t: T) => Promise<U>) => (t: T) => Promise<U> = measureTime) {
        this.workers = workers;
        this.plugins = plugins;
    }

    async search<T>(
        searchMethodParams: SearchMethodParams | LegacySearchMethodProps,
        requestOptions?: any
    ): Promise<SearchResponses<T>> {
        const results: SearchResponses<T> = { results: [] };
        results.results.push(...(await this.searchForFacets(searchMethodParams, requestOptions)).results);
        results.results.push(...(await this.searchForHits<T>(searchMethodParams, requestOptions)).results);
        return results;
    }

     
    
    async searchForHits<T>(
        searchMethodParams: LegacySearchMethodProps | SearchMethodParams,
        requestOptions?: any | undefined
    ): Promise<{ results: Array<SearchResponse<T>> }> {
        if (!Array.isArray(searchMethodParams)) {
            throw new Error('Only LegacySearchMethodProps is implemented.');
        }
        return {
            results: await Promise.all(
                searchMethodParams
                  .filter((s) => s.type != 'facet')
                  .map(
                    this.plugins(async (searchMethodParam) => {
                      if (typeof searchMethodParam.params == 'undefined') {
                        throw new Error('Only LegacySearchMethodProps is implemented.');
                      }
                      
                      const params = searchMethodParam.params;
                      const query = params.query || '';

                      let indexName = searchMethodParam.indexName;
                      if (!Object.keys(this.workers).includes(indexName)) {
                        indexName = Object.keys(this.workers)[0];
                      }
                      const worker = this.workers[indexName];
                      
                      const { hits, facets, total, pageSize, pageNum } = await worker.search<T>({
                        query: query,
                        facet: searchMethodParam.facet,
                        facetFilters: params.facetFilters ?? [],
                        pageNum: params.page ?? 0,
                        pageSize: params.hitsPerPage == 0 ? 20 : params.hitsPerPage || 20,
                      });

                      return {
                                hits: hits,
                                query: query,
                                params: encodeURIComponent(query),
                                facets: facets,
                                renderingContent: {
                                    facetOrdering: {
                                        facets: {
                                            order: Object.keys(facets),
                                        },
                                    },
                                },
                                page: pageNum,
                                nbHits: total,
                                nbPages: Math.ceil(total / pageSize),
                                hitsPerPage: pageSize,
                            };
                      })
                    )
            ),
        };
    }

     
    async searchForFacets(
        searchMethodParams: LegacySearchMethodProps | SearchMethodParams,
        requestOptions?: any | undefined
    ): Promise<{ results: Array<SearchForFacetValuesResponse> }> {
        if (!Array.isArray(searchMethodParams)) {
            throw new Error('Only LegacySearchMethodProps is implemented.');
        }
        return {
            results: await Promise.all(
                searchMethodParams
                    .filter((s) => s.type == 'facet')
                    .map(
                        this.plugins(async (searchMethodParam) => {
                            if (typeof searchMethodParam.params == 'undefined') {
                                throw new Error('Only LegacySearchMethodProps is implemented.');
                            }
                            const params = searchMethodParam.params;
                            const query = params.query || '';
                            // @ts-expect-error: facetQuery is not used in the current implementation.
                            const facetQuery = params.facetQuery;

                            let indexName = searchMethodParam.indexName;
                            if (!Object.keys(this.workers).includes(indexName)) {
                                indexName = Object.keys(this.workers)[0];
                            }
                            const worker = this.workers[indexName];

                            const { facets } = await worker.search<unknown>({
                                query: query,
                                facet: searchMethodParam.facet,
                                facetFilters: params.facetFilters ?? [],
                                pageNum: 0,
                                pageSize: 20,
                            });

                            return {
                                facetHits: this._flattenFacets(facets, facetQuery, searchMethodParam.facet),
                                exhaustiveFacetsCount: true,
                            };
                        })
                    )
            ),
        };
    }

    _flattenFacets(
        facets: LunrFacetsCounts,
        facetQuery: string | undefined,
        facetName: string | undefined
    ): Array<FacetHits> {
        const result = [];
        for (const [key, values] of Object.entries(facets)) {
            if (typeof facetName != 'undefined' && facetName.length && facetName != key) {
                return result;
            }
            for (const [value, count] of Object.entries(values)) {
                if (typeof facetQuery != 'undefined' && !new RegExp(facetQuery, 'i').test(value)) {
                    continue;
                }
                result.push({
                    value: `${value}`,
                    highlighted: value,
                    count: count as number,
                });
            }
        }
        return result;
    }
}

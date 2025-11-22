import type { Hit } from '@algolia/client-search';
import type { FacetFilters } from '@algolia/client-search';

import lunr from 'lunr';
import type {
    LunrCorpus,
    LunrMapping,
    LunrFacetsCounts,
    LunrSearchWorkerInterface,
    LunrSearchMethodSignature,
} from './types';
import { withCache } from './decorators/cacheDecorator';

/**
 * Use the lunr.js framework to build and answer basic queries.
 */
export default class LunrSearchWorker implements LunrSearchWorkerInterface {
    private corpus: LunrCorpus | undefined;
    private index: lunr.Index | undefined;
    private mapping: LunrMapping | undefined;
    private documentCount: number | undefined;
    private censorFacetThreshold: number;
    private dataUrl: string;

    constructor(dataUrl: string, censorFacetThreshold = 100) {
        this.dataUrl = dataUrl;
        this.censorFacetThreshold = censorFacetThreshold;
    }

    async getIndex(): Promise<{
        index: lunr.Index;
        corpus: LunrCorpus;
        mapping: LunrMapping;
        documentCount: number;
    }> {
        if (
            typeof this.index != 'undefined' &&
            typeof this.corpus != 'undefined' &&
            typeof this.mapping != 'undefined' &&
            typeof this.documentCount != 'undefined'
        ) {
            return {
                index: this.index,
                corpus: this.corpus,
                mapping: this.mapping,
                documentCount: this.documentCount,
            };
        }
        return await fetch(this.dataUrl)
            .then((r) => r.json())
            .catch(async () => {
                return await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = this.dataUrl.slice(0, -2);
                    document.head.appendChild(script);
                    script.onload = () => {
                        resolve(JSON.parse(sessionStorage.getItem('fallback') || '{}'));
                    };
                });
            })
            .then(({ docs, mapping, computedIndex }) => {
                this.corpus = docs;
                this.mapping = mapping;
                this.documentCount = docs.length;
                if (computedIndex != null) {
                    this.index = lunr.Index.load(computedIndex);
                }
                this.index = lunr(function () {
                    this.ref(mapping.ref);
                    mapping.fields.forEach((f: string) => this.field(f));
                    docs.forEach((doc: LunrCorpus[number]) => {
                        this.add(doc);
                    });
                });
                return {
                    index: this.index,
                    corpus: docs,
                    mapping: mapping,
                    documentCount: docs.length,
                };
            });
    }

    _countFacets<T>(jsonArray: Hit<T>[]): LunrFacetsCounts {
        return jsonArray.reduce((acc, obj) => {
            Object.keys(obj).forEach((key) => {
                let value = obj[key as keyof typeof obj];
                if (Array.isArray(value)) {
                    value = value.join(', ') as never;
                }
                if (!['string', 'number'].includes(typeof value)) {
                    return;
                }
                if (typeof value == 'string' && value.length > 64) {
                    return;
                }
                if (typeof this.mapping != 'undefined' && [this.mapping.ref, 'objectID', 'ref'].includes(key)) {
                    return;
                }
                if (!acc[key]) {
                    acc[key] = {};
                }
                if (acc[key][value as string]) {
                    acc[key][value as string]++;
                } else {
                    acc[key][value as string] = 1;
                }
            });
            return acc;
        }, {} as LunrFacetsCounts);
    }

    @withCache
    async search<T>({ query, facet, facetFilters, pageNum, pageSize }: LunrSearchMethodSignature): Promise<{
        hits: Hit<T>[];
        facets: LunrFacetsCounts;
        total: number;
        pageSize: number;
        pageNum: number;
    }> {
        const { index, corpus, mapping, documentCount } = await this.getIndex();
        const lunrResponseForQuery: Hit<T>[] = await index.search(query).map((match) => {
            const result: T = {} as T;
            return {
                ...result,
                ...match,
                ...corpus.find((doc) => doc[mapping.ref] === match.ref),
                objectID: match.ref,
            };
        });

        const facets = this._filterFacetsWithSingleResult(
            this._countFacets<T>(lunrResponseForQuery),
            facet,
            facetFilters,
            documentCount
        );
        const hits = lunrResponseForQuery.filter(this._createFacetFilterOnHits(facetFilters));
        return {
            hits: hits.slice(pageNum * pageSize, (pageNum + 1) * pageSize),
            facets: facets,
            total: hits.length,
            pageSize: pageSize,
            pageNum: pageNum,
        };
    }

    _createFacetFilterOnHits<T>(facetFilters: FacetFilters): (value: Hit<T>) => boolean {
        if (typeof facetFilters == 'string') {
            facetFilters = [facetFilters];
        }
        return (match) =>
            facetFilters.reduce((acc: boolean, filter: FacetFilters) => {
                if (typeof filter[0] != 'string') {
                    return acc && false;
                }
                const key = filter[0].split(':')[0];
                const value = filter[0].split(':')[1];
                if (!match.hasOwnProperty(key)) {
                    return acc && false;
                }
                const target = match[key as keyof typeof match];
                return acc && target == value;
            }, true);
    }

    _filterFacetsWithSingleResult(
        facets: LunrFacetsCounts,
        facet: string | undefined,
        facetFilters: FacetFilters,
        maxResultCount: number
    ): LunrFacetsCounts {
        return Object.fromEntries(
            Object.entries(facets).filter(([key, values]) => {
                if (facet && key != facet) {
                    return false;
                }
                if (Object.keys(values).length > (this.censorFacetThreshold * maxResultCount) / 100) {
                    return false;
                }
                if (Object.keys(values).some((v) => v.length > 63)) {
                    return false;
                }
                if (typeof facetFilters == 'string') {
                    facetFilters = [facetFilters];
                }
                return (
                    facetFilters
                        .filter((filter) => typeof filter == 'string')
                        .reduce((acc, filter) => acc || filter[0].split(':')[0] == key, false) ||
                    facet ||
                    Object.keys(values).length > 1
                );
            })
        );
    }
}

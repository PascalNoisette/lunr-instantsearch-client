import type { FacetFilters, Hit, LegacySearchMethodProps } from '@algolia/client-search';

export type LunrCorpus = { [key: string]: string }[];

export interface LunrFacetsCounts {
    [key: string]: {
        [key: string]: number;
    };
}

export type LunrMapping = {
    ref: string;
    fields: string[];
};

export type _LegacySearchQuery = LegacySearchMethodProps[number];

export type LunrSearchMethodSignature = {
    query: string;
    facet: string | undefined;
    facetFilters: FacetFilters;
    pageNum: number;
    pageSize: number;
};
export interface LunrSearchWorkerInterface {
    search<T>(props: LunrSearchMethodSignature): Promise<{
        hits: Hit<T>[];
        facets: LunrFacetsCounts;
        total: number;
        pageSize: number;
        pageNum: number;
    }>;
}

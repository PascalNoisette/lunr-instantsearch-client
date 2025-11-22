import LunrSearchClient from './LunrSearchClient';
import LunrSearchWorker from './LunrSearchWorker';
import type { SearchClient } from '@algolia/client-search';
import type {
    LunrFacetsCounts,
    LunrCorpus,
    LunrMapping,
    LunrSearchMethodSignature,
    LunrSearchWorkerInterface,
} from './types';

/**
 * Create a lunr index for InstantSearch with the data supplied at the resource url
 * in a JSON file.
 *
 * The data must be formated with the following JSON structure:
 * ```
 * {
 *     docs:LunrCorpus;
 *     mapping: LunrMapping;
 *     computedIndex?: object; // An optional previously serialized lunr.Index
 *     [key: string]?: any; // Discarded if any
 * }
 * ```
 *
 * In order to build an offline file:/// version of your application, wrap the structure
 * into a javascript file instead.
 *
 * ```
 * sessionStorage.setItem('fallback', JSON.stringify( * {
 *     docs:LunrCorpus;
 *     mapping: LunrMapping;
 * });
 * ```
 *
 * The fallback will try to load the .js version of the resourceUrl.json when the later failed.
 * The expected communication between the fallback and the lurn client is setting the JSON data
 * into sessionStorage under the key 'fallback'.
 *
 * @param resourceUrl: url to the search data, default search_index.json relative to the current web subpath.
 * @returns SearchClient for InstantSearch
 */
const createSearchClient = (resourceUrl: string = 'search_index.json'): SearchClient => {
    const worker = new LunrSearchWorker(resourceUrl, 80);
    return new LunrSearchClient({resourceUrl:worker}) as unknown as SearchClient;
};
export default createSearchClient;
export {
    LunrCorpus,
    LunrMapping,
    LunrSearchClient,
    LunrSearchWorker,
    LunrSearchMethodSignature,
    LunrFacetsCounts,
    LunrSearchWorkerInterface,
};

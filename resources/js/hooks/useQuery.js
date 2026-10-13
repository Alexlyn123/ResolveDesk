import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {() => Promise<any>} fetcher
 * @param {any[]} deps re-run when these change
 */
export function useQuery(fetcher, deps = []) {
    const [state, setState] = useState({ data: undefined, error: null, loading: true, refreshing: false });
    const latest = useRef(0);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const run = useCallback(() => {
        const id = ++latest.current;

        setState((previous) => ({
            ...previous,
            error: null,
            loading: previous.data === undefined,
            refreshing: previous.data !== undefined,
        }));

        return fetcherRef.current().then(
            (data) => {
                if (id === latest.current) {
                    setState({ data, error: null, loading: false, refreshing: false });
                }
            },
            (error) => {
                if (id === latest.current) {
                    setState((previous) => ({ ...previous, error, loading: false, refreshing: false }));
                }
            },
        );
    }, []);

    useEffect(() => {
        run();

        return () => {
            latest.current++;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    const setData = useCallback((data) => {
        setState((previous) => ({
            ...previous,
            data: typeof data === 'function' ? data(previous.data) : data,
        }));
    }, []);

    return { ...state, reload: run, setData };
}

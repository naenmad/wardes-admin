'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider as DefaultCacheProvider } from '@emotion/react';

export type NextAppDirEmotionCacheProviderProps = {
    options: Parameters<typeof createCache>[0];
    CacheProvider?: typeof DefaultCacheProvider;
    children: React.ReactNode;
};

export function NextAppDirEmotionCacheProvider(props: NextAppDirEmotionCacheProviderProps) {
    const { options, CacheProvider = DefaultCacheProvider, children } = props;

    const [registry] = React.useState(() => {
        const cache = createCache(options);
        cache.compat = true;
        const prevInsert = cache.insert;
        let inserted: { name: string; isGlobal: boolean }[] = [];
        cache.insert = (...args) => {
            const [selector, serialized] = args;
            if (serialized.name !== undefined && serialized.name.indexOf('Mui') === 0) {
                const name = serialized.name;
                const isGlobal = selector === '';
                const existingIndex = inserted.findIndex(
                    (item) => item.name === name && item.isGlobal === isGlobal
                );
                if (existingIndex === -1) {
                    inserted.push({ name, isGlobal });
                }
            }
            return prevInsert(...args);
        };
        const flush = () => {
            const prevInserted = inserted;
            inserted = [];
            return prevInserted;
        };
        return { cache, flush };
    });

    useServerInsertedHTML(() => {
        const inserted = registry.flush();
        if (inserted.length === 0) {
            return null;
        }
        let styles = '';
        let dataEmotionAttribute = registry.cache.key;

        const emotionStyles = document.querySelectorAll(`style[data-emotion="${dataEmotionAttribute}"]`);
        emotionStyles.forEach((node) => {
            styles += node.innerHTML;
        });

        return (
            <style
                key={dataEmotionAttribute}
                data-emotion={dataEmotionAttribute}
                dangerouslySetInnerHTML={{ __html: styles }}
            />
        );
    });

    return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}
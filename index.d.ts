import * as generated from './output/index';

import type { SettingsType } from './output/core/Settings';

type GeneratedNerdamer = typeof generated.default;
type RootSettings = SettingsType & { PRECISION: number };
type Nerdamer = Omit<GeneratedNerdamer, 'get'> &
	((...args: Parameters<GeneratedNerdamer>) => ReturnType<GeneratedNerdamer>) & {
		get<K extends keyof RootSettings>(setting: K): RootSettings[K];
	};

declare const nerdamer: Nerdamer;

export = nerdamer;

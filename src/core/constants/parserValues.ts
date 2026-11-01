import Decimal from 'decimal.js';

import { E, PI_NAME, PI_SYMBOL } from './symbolNames';

// Parser Constants
export const PARSER_CONSTANTS = {
	[PI_NAME]: () => {
		return Decimal.acos(-1).toString();
	},
	[PI_SYMBOL]: () => {
		return Decimal.acos(-1).toString();
	},
	[E]: () => {
		return Decimal.exp(1).toString();
	},
};

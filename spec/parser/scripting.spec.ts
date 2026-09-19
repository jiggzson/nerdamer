import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { callFunction } from '../../src/core/classes/parser/operations/functions';
import {
	BLOCK,
	BREAK,
	CONTINUE,
	FOR,
	IF,
	RETURN,
	ReturnSignal,
	WHILE,
} from '../../src/core/classes/parser/scripting/controlFlow';
import { wrappedFunction } from '../../src/core/classes/parser/scripting/functions';
import { LET } from '../../src/core/classes/parser/scripting/scope';
import { Vector } from '../../src/core/classes/vector/Vector';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import { setFunction } from '../../src/core/functions/setFunction';

describe('Parser scripting', () => {
	it('supports if without a false branch', () => {
		const trueResult = Parser.parse('if(1,5)');
		const falseResult = Parser.parse('if(0,5)');

		expect(trueResult.text()).toEqual('5');
		expect(Vector.isVector(falseResult)).toBe(true);
		if (Vector.isVector(falseResult)) {
			expect(falseResult.count()).toEqual(0);
		}
	});

	it('ignores tabs and line breaks in formatted control flow', () => {
		const x = 'script_format_x';
		const y = 'script_format_y';
		const hit = 'script_format_hit';
		delete Parser.KNOWN_VALUES[x];
		delete Parser.KNOWN_VALUES[y];
		delete Parser.KNOWN_VALUES[hit];

		try {
			const source = [
				'block(',
				`\t${x}: 5,`,
				`\t${y}: 0,`,
				`\t${hit}: -1,`,
				'\tfor(',
				`\t\t${y}: 0,`,
				`\t\t${y} < 10,`,
				`\t\t${y}: ${y} + 1,`,
				'\t\tif(',
				`\t\t\t${x} == ${y},`,
				`\t\t\t${hit}: ${x}`,
				'\t\t)',
				'\t),',
				'',
				`\t${hit}`,
				')',
			].join('\r\n');
			const result = Parser.parse(source);

			expect(result.text()).toEqual('5');
		} finally {
			delete Parser.KNOWN_VALUES[x];
			delete Parser.KNOWN_VALUES[y];
			delete Parser.KNOWN_VALUES[hit];
		}
	});

	it('defers function bodies until each call', () => {
		const name = 'script_deferred_function';
		const counter = 'script_deferred_function_counter';
		delete mathFunctionRegistry[name];
		Parser.KNOWN_VALUES[counter] = Expression.create(0);

		try {
			Parser.parse(`${name}(x):=block(${counter}:${counter}+1,return(x+${counter}))`);

			expect(Parser.parse(counter).text()).toEqual('0');
			expect(Parser.parse(`${name}(4)`).text()).toEqual('5');
			expect(Parser.parse(counter).text()).toEqual('1');
			expect(Parser.parse(`${name}(4)`).text()).toEqual('6');
			expect(Parser.parse(counter).text()).toEqual('2');
		} finally {
			delete mathFunctionRegistry[name];
			delete Parser.KNOWN_VALUES[counter];
		}
	});

	it('stops a deferred declaration body at the next block argument', () => {
		const name = 'script_deferred_boundary';
		const powerName = 'script_deferred_power';
		delete mathFunctionRegistry[name];
		delete mathFunctionRegistry[powerName];

		try {
			const result = Parser.parse(`block(${name}(x):=x+1,7)`);
			Parser.parse(`${powerName}():=2^3^2`);

			expect(result.text()).toEqual('7');
			expect(Parser.parse(`${name}(2)`).text()).toEqual('3');
			expect(Parser.parse(`${powerName}()`).text()).toEqual('512');
		} finally {
			delete mathFunctionRegistry[name];
			delete mathFunctionRegistry[powerName];
		}
	});

	it('calls a function declared earlier in the same tokenized source', () => {
		const name = 'script_same_source_function';
		delete mathFunctionRegistry[name];

		try {
			const result = Parser.parse(`block(${name}(x,y):=x+y,${name}(2,3))`);

			expect(result.text()).toEqual('5');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('calls a zero-argument function declared earlier in the same tokenized source', () => {
		const name = 'script_same_source_zero_argument';
		delete mathFunctionRegistry[name];

		try {
			const result = Parser.parse(`block(${name}():=return(7),${name}())`);

			expect(result.text()).toEqual('7');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('resolves same-source function calls inside nested deferred control flow', () => {
		const name = 'script_same_source_nested';
		delete mathFunctionRegistry[name];

		try {
			const result = Parser.parse(`block(${name}(x):=x+1,if(1,${name}(4),0))`);

			expect(result.text()).toEqual('5');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('preserves implicit multiplication when parenthesis adjacency is still a variable', () => {
		const name = 'script_implicit_parenthesis';
		delete mathFunctionRegistry[name];

		try {
			expect(Parser.parse(`${name}(y)^2`).text()).toEqual(
				Parser.parse(`${name}*y^2`).text()
			);
			expect(Parser.parse('sin(0)').text()).toEqual('0');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('supports zero-argument parser function declarations', () => {
		const name = 'script_zero_argument_function';
		delete mathFunctionRegistry[name];

		try {
			Parser.parse(`${name}():=return(7)`);

			expect(Parser.parse(`${name}()`).text()).toEqual('7');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('does not capture call-scoped values from declaration parsing', () => {
		const name = 'script_deferred_values';
		const free = 'script_deferred_values_free';
		delete mathFunctionRegistry[name];
		Parser.KNOWN_VALUES[free] = Expression.create(2);

		try {
			Parser.parse(`${name}(x):=x+${free}`, { [free]: 99 });

			expect(Parser.parse(`${name}(3)`).text()).toEqual('5');
		} finally {
			delete mathFunctionRegistry[name];
			delete Parser.KNOWN_VALUES[free];
		}
	});

	it('executes formatted scripting bodies declared with assignment syntax', () => {
		const name = 'script_declared_search';
		const local = 'script_declared_search_index';
		delete mathFunctionRegistry[name];
		Parser.KNOWN_VALUES[local] = Expression.create(9);

		try {
			const source = [
				`${name}(x):=let(${local},0,`,
				'\tblock(',
				`\t\tfor(${local}:0, ${local}<10, ${local}:${local}+1,`,
				'\t\t\tif(x=='+local+',',
				'\t\t\t\treturn(x)',
				'\t\t\t)',
				'\t\t),',
				'\t\treturn(-1)',
				'\t)',
				')',
			].join('\n');

			Parser.parse(source);

			expect(Parser.parse(`${name}(5)`).text()).toEqual('5');
			expect(Parser.parse(`${name}(12)`).text()).toEqual('-1');
			expect(Parser.parse(local).text()).toEqual('9');
		} finally {
			delete mathFunctionRegistry[name];
			delete Parser.KNOWN_VALUES[local];
		}
	});

	it('evaluates parser values from Nerdamer Scripting', () => {
		expect(Parser.parse('evaluate(sin(2))').text()).toEqual(
			'0.9092974268256816954'
		);
		expect(Parser.parse('evaluate([sin(2),cos(0)])').text()).toEqual(
			'[0.9092974268256816954, 1]'
		);
		expect(Parser.parse('evaluate(sin(2)=cos(0))').text()).toEqual(
			'0.9092974268256816954=1'
		);
		expect(Parser.parse('evaluate(x)').text()).toEqual('x');
	});

	it('returns the input when parser evaluation throws', () => {
		const input = Expression.Variable('script_evaluate_failure');
		jest.spyOn(input, 'evaluate').mockImplementation(() => {
			throw new Error('evaluation failed');
		});

		const result = callFunction('evaluate', [() => input]);

		expect(result).toBe(input);
	});

	it('never leaves evaluate as a symbolic parser function', () => {
		const previous = Parser.get('DEFER_SIMPLIFICATION');

		try {
			Parser.set('DEFER_SIMPLIFICATION', true);
			const result = Parser.parse('evaluate(x+1)');

			expect(Expression.isExpression(result)).toBe(true);
			if (Expression.isExpression(result)) {
				expect(result.isFunction('evaluate')).toBe(false);
			}
		} finally {
			Parser.set('DEFER_SIMPLIFICATION', previous);
		}
	});

	it('executes Newton iteration through parser-defined control flow', () => {
		delete mathFunctionRegistry['newton_sqrt'];
		Parser.KNOWN_VALUES['estimate'] = Expression.create(91);
		Parser.KNOWN_VALUES['step'] = Expression.create(92);

		try {
			Parser.parse(`
newton_sqrt(value, guess, tolerance, limit):=
    let(estimate, guess, step, 0,
        block(
            for(
                step:0,
                limit - step,
                step:step + 1,
                block(
                    if(abs(estimate^2 - value) < tolerance, break()),
                    estimate:estimate - (estimate^2 - value)/(2*estimate)
                )
            ),
            return(estimate)
        )
    )
`);

			expect(Parser.parse('estimate').text()).toEqual('91');
			expect(Parser.parse('step').text()).toEqual('92');

			const result = Parser.parse('newton_sqrt(2, 1, 1e-20, 20)');

			expect(Expression.isExpression(result)).toBe(true);
			if (Expression.isExpression(result)) {
				expect(Number(result.text({ decimal: true }))).toBeCloseTo(Math.SQRT2, 14);
			}
			expect(Parser.parse('estimate').text()).toEqual('91');
			expect(Parser.parse('step').text()).toEqual('92');
		} finally {
			delete mathFunctionRegistry['newton_sqrt'];
			delete Parser.KNOWN_VALUES['estimate'];
			delete Parser.KNOWN_VALUES['step'];
		}
	});
});

describe('Control function evaluation', () => {
	it('lets if control evaluation of its deferred arguments', () => {
		const calls = [0, 0, 0];
		const result = IF(
			() => {
				calls[0]++;
				return Expression.create(1);
			},
			() => {
				calls[1]++;
				return Expression.create(5);
			},
			() => {
				calls[2]++;
				return Expression.create(6);
			}
		);

		expect(result.text()).toEqual('5');
		expect(calls).toEqual([1, 1, 0]);
	});

	it('lets while reevaluate its deferred condition and body', () => {
		let value = 0;
		let conditionCalls = 0;
		let bodyCalls = 0;
		const result = WHILE(
			() => {
				conditionCalls++;
				return Expression.create(3 - value);
			},
			() => {
				bodyCalls++;
				value++;
				return Expression.create(value);
			}
		);

		expect(result.text()).toEqual('3');
		expect(conditionCalls).toEqual(4);
		expect(bodyCalls).toEqual(3);
	});

	it('does not evaluate a while body when its condition starts at zero', () => {
		let bodyCalls = 0;
		const result = WHILE(
			() => Expression.create(0),
			() => {
				bodyCalls++;
				return Expression.create(1);
			}
		);

		expect(Vector.isVector(result)).toBe(true);
		if (Vector.isVector(result)) {
			expect(result.count()).toEqual(0);
		}
		expect(bodyCalls).toEqual(0);
	});

	it('allows the configured maximum while iterations and blocks the next one', () => {
		const previousLimit = Parser.get('MAX_LOOP_ITERATIONS');
		let value = 0;

		try {
			Parser.set('MAX_LOOP_ITERATIONS', 2);
			const result = WHILE(
				() => Expression.create(2 - value),
				() => {
					value++;
					return Expression.create(value);
				}
			);

			expect(result.text()).toEqual('2');
			expect(value).toEqual(2);

			value = 0;
			expect(() =>
				WHILE(
					() => Expression.create(1),
					() => {
						value++;
						return Expression.create(value);
					}
				)
			).toThrow('Loop exceeded the maximum of 2 iterations.');
			expect(value).toEqual(2);
			expect(() => Parser.parse('while(1,1)')).toThrow(
				'Loop exceeded the maximum of 2 iterations.'
			);
		} finally {
			Parser.set('MAX_LOOP_ITERATIONS', previousLimit);
		}
	});

	it('counts continued while iterations against the loop guard', () => {
		const previousLimit = Parser.get('MAX_LOOP_ITERATIONS');
		let bodyCalls = 0;

		try {
			Parser.set('MAX_LOOP_ITERATIONS', 2);
			expect(() =>
				WHILE(
					() => Expression.create(1),
					() => {
						bodyCalls++;
						return CONTINUE();
					}
				)
			).toThrow('Loop exceeded the maximum of 2 iterations.');
			expect(bodyCalls).toEqual(2);
		} finally {
			Parser.set('MAX_LOOP_ITERATIONS', previousLimit);
		}
	});

	it('inherits the while iteration limit in for', () => {
		const previousLimit = Parser.get('MAX_LOOP_ITERATIONS');
		let bodyCalls = 0;
		let updateCalls = 0;

		try {
			Parser.set('MAX_LOOP_ITERATIONS', 2);
			expect(() =>
				FOR(
					() => Expression.create(0),
					() => Expression.create(1),
					() => {
						updateCalls++;
						return Expression.create(updateCalls);
					},
					() => {
						bodyCalls++;
						return Expression.create(bodyCalls);
					}
				)
			).toThrow('Loop exceeded the maximum of 2 iterations.');

			expect(bodyCalls).toEqual(2);
			expect(updateCalls).toEqual(2);
		} finally {
			Parser.set('MAX_LOOP_ITERATIONS', previousLimit);
		}
	});

	it('runs for initializer once and body/update on each completed iteration', () => {
		let value = -1;
		const calls: string[] = [];
		const result = FOR(
			() => {
				calls.push('initializer');
				value = 0;
				return Expression.create(value);
			},
			() => {
				calls.push(`condition:${value}`);
				return Expression.create(3 - value);
			},
			() => {
				calls.push(`update:${value}`);
				value++;
				return Expression.create(value);
			},
			() => {
				calls.push(`body:${value}`);
				return Expression.create(value + 10);
			}
		);

		expect(result.text()).toEqual('12');
		expect(value).toEqual(3);
		expect(calls).toEqual([
			'initializer',
			'condition:0',
			'body:0',
			'update:0',
			'condition:1',
			'body:1',
			'update:1',
			'condition:2',
			'body:2',
			'update:2',
			'condition:3',
		]);
	});

	it('runs a for update after continue and skips the rest of the body', () => {
		let value = 0;
		let updateCalls = 0;
		let completedBodyTotal = 0;
		const result = FOR(
			() => Expression.create(value),
			() => Expression.create(3 - value),
			() => {
				updateCalls++;
				value++;
				return Expression.create(value);
			},
			() => {
				if (value === 1) {
					return CONTINUE();
				}
				completedBodyTotal += value;
				return Expression.create(value);
			}
		);

		expect(result.text()).toEqual('2');
		expect(value).toEqual(3);
		expect(updateCalls).toEqual(3);
		expect(completedBodyTotal).toEqual(2);
	});

	it('skips the pending for update after break', () => {
		let value = 0;
		let bodyCalls = 0;
		let updateCalls = 0;
		const result = FOR(
			() => Expression.create(value),
			() => Expression.create(5 - value),
			() => {
				updateCalls++;
				value++;
				return Expression.create(value);
			},
			() => {
				bodyCalls++;
				if (value === 2) {
					return BREAK();
				}
				return Expression.create(value);
			}
		);

		expect(result.text()).toEqual('1');
		expect(value).toEqual(2);
		expect(bodyCalls).toEqual(3);
		expect(updateCalls).toEqual(2);
	});

	it('consumes break at the nearest nested loop', () => {
		let outer = 0;
		let innerBreaks = 0;
		const result = WHILE(
			() => Expression.create(2 - outer),
			() => {
				let inner = 0;
				WHILE(
					() => Expression.create(1 - inner),
					() => {
						inner++;
						innerBreaks++;
						return BREAK();
					}
				);
				outer++;
				return Expression.create(outer);
			}
		);

		expect(result.text()).toEqual('2');
		expect(outer).toEqual(2);
		expect(innerBreaks).toEqual(2);
	});

	it('evaluates only the selected if branch', () => {
		expect(Parser.parse('if(1,5,0/0)').text()).toEqual('5');
		expect(Parser.parse('if(0,0/0,5)').text()).toEqual('5');
	});

	it('allows side effects only in the selected if branch', () => {
		const variable = 'script_branch_value';
		delete Parser.KNOWN_VALUES[variable];

		try {
			expect(Parser.parse(`if(1,${variable}:1,${variable}:2)`).text()).toEqual('1');
			expect(Parser.parse(variable).text()).toEqual('1');

			delete Parser.KNOWN_VALUES[variable];

			expect(Parser.parse(`if(0,${variable}:1,${variable}:2)`).text()).toEqual('2');
			expect(Parser.parse(variable).text()).toEqual('2');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('reevaluates parser state between while iterations', () => {
		const variable = 'script_while_value';
		delete Parser.KNOWN_VALUES[variable];

		try {
			const result = Parser.parse(
				`block(${variable}:0,while(3-${variable},${variable}:${variable}+1),${variable})`
			);

			expect(result.text()).toEqual('3');
			expect(Parser.parse(variable).text()).toEqual('3');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('evaluates parser break and continue inside loop bodies', () => {
		const breakValue = 'script_break_value';
		const continueValue = 'script_continue_value';
		const skippedValue = 'script_continue_skipped';
		delete Parser.KNOWN_VALUES[breakValue];
		delete Parser.KNOWN_VALUES[continueValue];
		delete Parser.KNOWN_VALUES[skippedValue];

		try {
			const breakResult = Parser.parse(
				`block(${breakValue}:0,while(1,block(${breakValue}:${breakValue}+1,break(),${breakValue}:99)),${breakValue})`
			);
			expect(breakResult.text()).toEqual('1');

			const continueResult = Parser.parse(
				`block(${continueValue}:0,${skippedValue}:0,while(3-${continueValue},block(${continueValue}:${continueValue}+1,continue(),${skippedValue}:${skippedValue}+1)),[${continueValue},${skippedValue}])`
			);
			expect(continueResult.text()).toEqual('[3, 0]');
		} finally {
			delete Parser.KNOWN_VALUES[breakValue];
			delete Parser.KNOWN_VALUES[continueValue];
			delete Parser.KNOWN_VALUES[skippedValue];
		}
	});

	it('runs the parser for update when continue skips its body remainder', () => {
		const index = 'script_continue_for_index';
		const total = 'script_continue_for_total';
		delete Parser.KNOWN_VALUES[index];
		delete Parser.KNOWN_VALUES[total];

		try {
			const result = Parser.parse(
				`block(${index}:0,${total}:0,for(${index}:0,4-${index},${index}:${index}+1,if(${index}-2,${total}:${total}+${index},continue())),[${index},${total}])`
			);

			expect(result.text()).toEqual('[4, 4]');
		} finally {
			delete Parser.KNOWN_VALUES[index];
			delete Parser.KNOWN_VALUES[total];
		}
	});

	it('rejects break and continue outside loops and across symbolic function calls', () => {
		const breakFunction = 'script_break_function_boundary';
		const continueFunction = 'script_continue_function_boundary';
		delete mathFunctionRegistry[breakFunction];
		delete mathFunctionRegistry[continueFunction];

		try {
			expect(() => Parser.parse('break()')).toThrow('break can only be used inside a loop.');
			expect(() => Parser.parse('continue()')).toThrow(
				'continue can only be used inside a loop.'
			);

			setFunction({ type: 'symbolic', name: breakFunction, argsOrder: [], fn: 'break()' });
			setFunction({ type: 'symbolic', name: continueFunction, argsOrder: [], fn: 'continue()' });

			expect(() => Parser.parse(`while(1,${breakFunction}())`)).toThrow(
				'break can only be used inside a loop.'
			);
			expect(() => Parser.parse(`while(1,${continueFunction}())`)).toThrow(
				'continue can only be used inside a loop.'
			);
		} finally {
			delete mathFunctionRegistry[breakFunction];
			delete mathFunctionRegistry[continueFunction];
		}
	});

	it('evaluates for through symbolic function parameters without leaking loop state', () => {
		const index = 'script_for_index';
		const total = 'script_for_total';
		delete Parser.KNOWN_VALUES[index];
		delete Parser.KNOWN_VALUES[total];

		try {
			const fn = wrappedFunction(
				`block(for(${index}:0,3-${index},${index}:${index}+1,${total}:${total}+${index}),return(${total}))`,
				[index, total]
			);
			const result = fn(Expression.create(9), Expression.create(0));

			expect(result.text()).toEqual('3');
			expect(Parser.parse(index).text()).toEqual(index);
			expect(Parser.parse(total).text()).toEqual(total);
		} finally {
			delete Parser.KNOWN_VALUES[index];
			delete Parser.KNOWN_VALUES[total];
		}
	});

	it('keeps symbolic function parameter reassignment local to the call', () => {
		const variable = 'script_function_parameter';
		Parser.KNOWN_VALUES[variable] = Expression.create(9);

		try {
			const fn = wrappedFunction(
				`block(${variable}:${variable}+1,return(${variable}))`,
				[variable]
			);
			const result = fn(Expression.create(4));

			expect(result.text()).toEqual('5');
			expect(Parser.parse(variable).text()).toEqual('9');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('updates symbolic function parameters across while iterations without leaking them', () => {
		const variable = 'script_while_parameter';
		delete Parser.KNOWN_VALUES[variable];

		try {
			const fn = wrappedFunction(
				`block(while(3-${variable},${variable}:${variable}+1),return(${variable}))`,
				[variable]
			);
			const result = fn(Expression.create(0));

			expect(result.text()).toEqual('3');
			expect(Parser.parse(variable).text()).toEqual(variable);
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('preserves assignment targets while substituting the right side', () => {
		const variable = 'script_assignment_target';
		delete Parser.KNOWN_VALUES[variable];

		try {
			Parser.parse(`${variable}:4`);
			const result = Parser.parse(`${variable}:${variable}+3`);

			expect(result.text()).toEqual('7');
			expect(Parser.parse(variable).text()).toEqual('7');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('persists indexed assignment to a named Vector', () => {
		const variable = 'script_index_assignment';
		const index = Parser.get('INDEX_BASE');
		delete Parser.KNOWN_VALUES[variable];

		try {
			Parser.parse(`${variable}:[1,2]`);
			const result = Parser.parse(`${variable}[${index}]:9`);

			expect(result.text()).toEqual('[9, 2]');
			expect(Parser.parse(variable).text()).toEqual('[9, 2]');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('persists indexed Matrix assignment with computed indices', () => {
		const matrix = 'script_index_matrix';
		const row = 'script_index_row';
		const col = 'script_index_col';
		const index = Number(Parser.get('INDEX_BASE'));
		delete Parser.KNOWN_VALUES[matrix];
		delete Parser.KNOWN_VALUES[row];
		delete Parser.KNOWN_VALUES[col];

		try {
			Parser.parse(`${matrix}:matrix([1,0],[0,1])`);
			Parser.parse(`${row}:${index}`);
			Parser.parse(`${col}:${index + 1}`);
			Parser.parse(`${matrix}[${row},${col}]:7`);

			expect(Parser.parse(matrix).text()).toEqual('matrix([1, 7], [0, 1])');
		} finally {
			delete Parser.KNOWN_VALUES[matrix];
			delete Parser.KNOWN_VALUES[row];
			delete Parser.KNOWN_VALUES[col];
		}
	});

	it('lets return unwind sequential block evaluation', () => {
		const calls: number[] = [];

		expect(() =>
			BLOCK(
				() => {
					calls.push(1);
					return Expression.create(1);
				},
				() => {
					calls.push(2);
					return RETURN(Expression.create(5));
				},
				() => {
					calls.push(3);
					return Expression.create(6);
				}
			)
		).toThrow(ReturnSignal);
		expect(calls).toEqual([1, 2]);
	});

	it('lets return unwind through while evaluation', () => {
		let conditionCalls = 0;
		expect(() =>
			WHILE(
				() => {
					conditionCalls++;
					return Expression.create(conditionCalls === 1 ? 1 : 0);
				},
				() => RETURN(Expression.create(7))
			)
		).toThrow(ReturnSignal);
		expect(conditionCalls).toEqual(1);
	});

	it('does not run a for update after return unwinds its body', () => {
		let value = 0;
		let updateCalls = 0;

		expect(() =>
			FOR(
				() => Expression.create(value),
				() => Expression.create(3 - value),
				() => {
					updateCalls++;
					value++;
					return Expression.create(value);
				},
				() => {
					if (value === 1) {
						return RETURN(Expression.create(7));
					}
					return Expression.create(value);
				}
			)
		).toThrow(ReturnSignal);

		expect(value).toEqual(1);
		expect(updateCalls).toEqual(1);
	});

	it('evaluates block statements in order and returns the final result', () => {
		const variable = 'script_block_value';
		delete Parser.KNOWN_VALUES[variable];

		try {
			const result = Parser.parse(
				`block(${variable}:1,${variable}:${variable}+2,${variable})`
			);

			expect(result.text()).toEqual('3');
			expect(Parser.parse(variable).text()).toEqual('3');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('stops symbolic function evaluation after return', () => {
		const variable = 'script_block_return_value';
		delete Parser.KNOWN_VALUES[variable];

		try {
			const fn = wrappedFunction(
				`block(${variable}:1,return(${variable}+1),${variable}:99)`,
				[]
			);
			const result = fn();

			expect(result.text()).toEqual('2');
			expect(Parser.parse(variable).text()).toEqual('1');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('propagates return through the selected if branch', () => {
		const variable = 'script_block_if_return_value';
		delete Parser.KNOWN_VALUES[variable];

		try {
			const fn = wrappedFunction(
				`block(${variable}:1,if(1,return(7),${variable}:9),${variable}:10)`,
				[]
			);
			const result = fn();

			expect(result.text()).toEqual('7');
			expect(Parser.parse(variable).text()).toEqual('1');
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('unwinds through ordinary function evaluation when return is reached', () => {
		const sideEffect = 'script_eager_return_side_effect';
		delete Parser.KNOWN_VALUES[sideEffect];

		try {
			const fn = wrappedFunction(`block(abs(return(5)),${sideEffect}:1)`, []);
			const result = fn();

			expect(result.text()).toEqual('5');
			expect(Parser.parse(sideEffect).text()).toEqual(sideEffect);
		} finally {
			delete Parser.KNOWN_VALUES[sideEffect];
		}
	});

	it('propagates return through nested blocks to the symbolic function boundary', () => {
		const sideEffect = 'script_nested_return_side_effect';
		delete Parser.KNOWN_VALUES[sideEffect];

		try {
			const fn = wrappedFunction(
				`block(block(return(x+1),${sideEffect}:1),${sideEffect}:2,99)`,
				['x']
			);
			const result = fn(Expression.create(4));

			expect(result.text()).toEqual('5');
			expect(Parser.parse(sideEffect).text()).toEqual(sideEffect);
		} finally {
			delete Parser.KNOWN_VALUES[sideEffect];
		}
	});

	it('keeps return local to the user function that produced it', () => {
		const inner = 'script_inner_return_function';
		const outer = 'script_outer_return_function';
		delete mathFunctionRegistry[inner];
		delete mathFunctionRegistry[outer];

		try {
			setFunction({ type: 'symbolic', name: inner, argsOrder: ['x'], fn: 'return(x+1)' });
			setFunction({
				type: 'symbolic',
				name: outer,
				argsOrder: ['x'],
				fn: `block(${inner}(x),return(9))`,
			});

			const result = Parser.parse(`${outer}(4)+1`);

			expect(result.text()).toEqual('10');
		} finally {
			delete mathFunctionRegistry[inner];
			delete mathFunctionRegistry[outer];
		}
	});

	it('preserves function input independence without copying in return', () => {
		const input = Expression.create('x+1');
		const fn = wrappedFunction('return(x)', ['x']);
		const result = fn(input);

		expect(Expression.isExpression(result)).toBe(true);
		if (Expression.isExpression(result)) {
			expect(result).not.toBe(input);
			expect(result.eq(input)).toBe(true);
		}
	});

	it('returns structured parser entities without expression coercion', () => {
		const fn = wrappedFunction('block(return([1,2]),0)', []);
		const result = fn();

		expect(Vector.isVector(result)).toBe(true);
		if (Vector.isVector(result)) {
			expect(result.text()).toEqual('[1, 2]');
		}
	});

	it('returns equations without expression coercion', () => {
		const fn = wrappedFunction('block(return(x=1),0)', []);
		const result = fn();

		expect(Equation.isEquation(result)).toBe(true);
		if (Equation.isEquation(result)) {
			expect(result.LHS.eq(Expression.create('x'))).toBe(true);
			expect(result.RHS.eq(Expression.create(1))).toBe(true);
		}
	});
});

describe('LET control function', () => {
	it('evaluates sequential local bindings without leaking them', () => {
		const x = 'script_let_x';
		const y = 'script_let_y';
		delete Parser.KNOWN_VALUES[x];
		delete Parser.KNOWN_VALUES[y];

		try {
			const result = Parser.parse(`let(${x},1,${y},${x}+2,${x}+${y})`);

			expect(result.text()).toEqual('4');
			expect(Parser.parse(x).text()).toEqual(x);
			expect(Parser.parse(y).text()).toEqual(y);
		} finally {
			delete Parser.KNOWN_VALUES[x];
			delete Parser.KNOWN_VALUES[y];
		}
	});

	it('shadows matching call-scoped values while preserving unrelated values', () => {
		const x = 'script_let_value_x';
		const y = 'script_let_value_y';
		const z = 'script_let_value_z';
		delete Parser.KNOWN_VALUES[x];
		delete Parser.KNOWN_VALUES[y];
		delete Parser.KNOWN_VALUES[z];

		try {
			const result = Parser.parse(`let(${x},1,${y},${x}+2,${x}+${y}+${z})`, {
				[x]: 99,
				[y]: 88,
				[z]: 4,
			});

			expect(result.text()).toEqual('8');
			expect(Parser.parse(x).text()).toEqual(x);
			expect(Parser.parse(y).text()).toEqual(y);
			expect(Parser.parse(z).text()).toEqual(z);
		} finally {
			delete Parser.KNOWN_VALUES[x];
			delete Parser.KNOWN_VALUES[y];
			delete Parser.KNOWN_VALUES[z];
		}
	});

	it('restores nested bindings after local reassignment', () => {
		const x = 'script_let_nested_x';
		Parser.KNOWN_VALUES[x] = Expression.create(9);

		try {
			const result = Parser.parse(`let(${x},1,block(${x}:${x}+1,let(${x},7,${x}),${x}))`);

			expect(result.text()).toEqual('2');
			expect(Parser.parse(x).text()).toEqual('9');
		} finally {
			delete Parser.KNOWN_VALUES[x];
		}
	});

	it('keeps assignments to undeclared names global', () => {
		const local = 'script_let_local';
		const sideEffect = 'script_let_side_effect';
		delete Parser.KNOWN_VALUES[local];
		delete Parser.KNOWN_VALUES[sideEffect];

		try {
			const result = Parser.parse(`let(${local},2,block(${sideEffect}:7,${local}))`);

			expect(result.text()).toEqual('2');
			expect(Parser.parse(local).text()).toEqual(local);
			expect(Parser.parse(sideEffect).text()).toEqual('7');
		} finally {
			delete Parser.KNOWN_VALUES[local];
			delete Parser.KNOWN_VALUES[sideEffect];
		}
	});

	it('restores locals when return unwinds through let', () => {
		const x = 'script_let_return_x';
		Parser.KNOWN_VALUES[x] = Expression.create(9);

		try {
			const fn = wrappedFunction(`let(${x},1,block(return(${x}+1),${x}:99))`, []);
			const result = fn();

			expect(result.text()).toEqual('2');
			expect(Parser.parse(x).text()).toEqual('9');
		} finally {
			delete Parser.KNOWN_VALUES[x];
		}
	});

	it('restores locals when continue unwinds through let', () => {
		const index = 'script_let_continue_index';
		const local = 'script_let_continue_local';
		delete Parser.KNOWN_VALUES[index];
		Parser.KNOWN_VALUES[local] = Expression.create(9);

		try {
			const result = Parser.parse(
				`block(${index}:0,while(3-${index},let(${local},${index},block(${index}:${index}+1,continue(),${local}:99))),${index})`
			);

			expect(result.text()).toEqual('3');
			expect(Parser.parse(local).text()).toEqual('9');
		} finally {
			delete Parser.KNOWN_VALUES[index];
			delete Parser.KNOWN_VALUES[local];
		}
	});

	it('rejects malformed bindings and invalid binding names', () => {
		expect(() => Parser.parse('let(x,1,y,2)')).toThrow(
			'let requires one or more name/value pairs followed by a body expression.'
		);
		expect(() => Parser.parse('let(x+1,2,0)')).toThrow('Expected plain variable!');
	});
});
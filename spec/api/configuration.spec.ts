import { ErrorMessages, message } from '../../src/core/errors';
import { Settings } from '../../src/core/Settings';
import nerdamer from '../../src/index';

describe('Public configuration access', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/147
	it('reads constants and parser settings', () => {
		const constantName = 'audit_constant_147';
		const previousImplicitMultiplication = nerdamer.get(
			'ALLOW_IMPLICIT_MULTIPLICATION'
		) as boolean;
		const previousPrecision = nerdamer.get('PRECISION') as number;

		try {
			nerdamer.setConstant(constantName, 1.25);
			expect(nerdamer.getConstant(constantName)).toEqual('5/4');
			expect(Number(nerdamer.getConstant('pi'))).toBeCloseTo(Math.PI, 15);

			nerdamer.set('ALLOW_IMPLICIT_MULTIPLICATION', !previousImplicitMultiplication);
			expect(nerdamer.get('ALLOW_IMPLICIT_MULTIPLICATION')).toBe(
				!previousImplicitMultiplication
			);

			nerdamer.set('PRECISION', 30);
			expect(nerdamer.get('PRECISION')).toBe(30);
		} finally {
			nerdamer.set('PRECISION', previousPrecision);
			nerdamer.set('ALLOW_IMPLICIT_MULTIPLICATION', previousImplicitMultiplication);
			nerdamer.setConstant(constantName, 'delete');
		}

		expect(nerdamer.getConstant(constantName)).toEqual('undefined');
	});

	it('keeps every language catalog aligned with English', () => {
		const englishKeys = Object.keys(ErrorMessages.eng).sort();

		for (const catalog of Object.values(ErrorMessages)) {
			expect(Object.keys(catalog).sort()).toEqual(englishKeys);
		}
	});

	it('routes parameterized messages through the selected language', () => {
		const previousLanguage = Settings.LANGUAGE;

		try {
			Settings.LANGUAGE = 'eng';
			expect(message('mismatchedDimensions', { function: 'dot' })).toEqual(
				'The dimensions must match for the function "dot"!'
			);
			expect(message('plainVariableExpected', { input: 'x+1' })).toEqual(
				'Expected plain variable! Received x+1.'
			);

			Settings.LANGUAGE = 'spa';
			expect(message('plainVariableExpected', { input: 'x+1' })).toEqual(
				'¡Se esperaba una variable simple! Se recibió x+1.'
			);
			expect(message('zeroDerivative', { x: '3' })).toEqual(
				'La derivada es cero en x = 3. No se puede continuar.'
			);

			Settings.LANGUAGE = 'fra';
			expect(message('plainVariableExpected', { input: 'x+1' })).toEqual(
				'Une variable simple était attendue ! Reçu : x+1.'
			);

			Settings.LANGUAGE = 'deu';
			expect(message('plainVariableExpected', { input: 'x+1' })).toEqual(
				'Eine einfache Variable wurde erwartet! Erhalten: x+1.'
			);

			Settings.LANGUAGE = 'por';
			expect(message('plainVariableExpected', { input: 'x+1' })).toEqual(
				'Era esperada uma variável simples! Recebido: x+1.'
			);

			Settings.LANGUAGE = 'ita';
			expect(message('plainVariableExpected', { input: 'x+1' })).toEqual(
				'Era attesa una variabile semplice! Ricevuto: x+1.'
			);

			Settings.LANGUAGE = 'nld';
			expect(message('plainVariableExpected', { input: 'x+1' })).toEqual(
				'Er werd een eenvoudige variabele verwacht! Ontvangen: x+1.'
			);
		} finally {
			Settings.LANGUAGE = previousLanguage;
		}
	});
});

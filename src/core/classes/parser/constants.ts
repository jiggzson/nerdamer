export * from '../../constants/entityTypes';
export * from '../../constants/functionNames';
/**
 * Internal compatibility entry point for parser, symbolic and function-name constants.
 *
 * Prefer the small, purpose-specific modules in src/core/constants for new imports.
 * PARSER_CONSTANTS and dataTypes intentionally retain their mutable registry semantics.
 */
export * from '../../constants/parserSyntax';
export * from '../../constants/parserValues';
export * from '../../constants/symbolNames';

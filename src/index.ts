import {ImportedPackageExpression, TranspileOptions, IResult} from 'ceveral-compiler'
import {TypescriptVisitor} from './visitor'

export default {
	name: 'Typescript',
	transform(ast: ImportedPackageExpression, options:TranspileOptions): Promise<IResult[]> {
		let visitor = new TypescriptVisitor();
		return Promise.resolve(visitor.parse(ast));
	}
}
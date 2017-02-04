import * as Path from 'path'
import {
    BaseVisitor, ValidationError, IResult, Type, Token,ImportedPackageExpression,
    Expression, PackageExpression, RecordExpression,
    AnnotationExpression, PropertyExpression, TypeExpression, ImportTypeExpression,
    RepeatedTypeExpression, MapTypeExpression, OptionalTypeExpression,
    ExpressionPosition, AnnotatedExpression, RecordTypeExpression, NumericEnumExpression,
    StringEnumExpression, StringEnumMemberExpression, NumericEnumMemberExpression
} from 'ceveral-compiler';

import { ucFirst } from './utils';

export class TypescriptVisitor extends BaseVisitor {
    imports: { [key: string]: Set<string> } = {};
    enumName: string;
    parse(item: ImportedPackageExpression) {
        let out = this.visit(item);
        let i = "";
        let imports = item.imports;
        if (Object.keys(this.imports).length) {
            let out = [];
            for (let key in this.imports) {
                let file = Path.basename(imports.find(m => m.name == key).fileName, '.cev');
                let array = [...this.imports[key]];
                out.push(`import {${array.join(', ')}} from './${file}'`);
            }
            i = out.join('\n');
        }

        i += "\n" + out;

        return [{
            filename: Path.basename(item.fileName, Path.extname(item.fileName)) + '.ts',
            buffer: new Buffer(i)
        }]
    }

    visitPackage(item: PackageExpression): any {
        let include = [Token.Record, Token.NumericEnum, Token.StringEnum];
        let records = item.children.filter(m => include.indexOf(m.nodeType) > -1).map(m => this.visit(m));
        return `// ${item.name}\n${records.join('\n\n')}\n`;
    }
    visitRecord(item: RecordExpression): any {
        let props = item.properties.map(m => this.visit(m));
        let c = !!item.get('tsclass');
        return `export ${c ? 'class' : 'interface'} ${ucFirst(item.name)} {\n${props.join('\n')}\n}`;
    }
    visitProperty(item: PropertyExpression): any {
        let type = this.visit(item.type);
        let isOptional = item.type.nodeType === Token.OptionalType;
        return `  ${item.name}` + (isOptional ? '?' : '') + ": " + type + ';'
    }

    visitAnnotation(item: AnnotationExpression): any {
        return item;
    }

    visitType(item: TypeExpression): any {
        let type = item.type;
        if (type === Type.Bytes) {
            throw new ValidationError("Typescript: A field cannot be binary");
        }
        switch (type) {
            case Type.Boolean: return "boolean";
            case Type.String: return "string";
            case Type.Date: return "Date";
            default: return "number";
        }

    }

    visitImportType(item: ImportTypeExpression): any {
        if (!this.imports[item.packageName]) this.imports[item.packageName] = new Set();
        this.imports[item.packageName].add(item.name);
        return item.name;
    }


    //visitPackage(expression: PackageExpression): any;
    visitRecordType(expression: RecordTypeExpression): any {
        return expression.name;
    }

    visitOptionalType(expression: OptionalTypeExpression): any {
        return this.visit(expression.type);
    }
    visitRepeatedType(expression: RepeatedTypeExpression): any {
        let type = this.visit(expression.type);
        return type + "[]";
    }
    visitMapType(expression: MapTypeExpression): any {
        let key = this.visit(expression.key);
        let val = this.visit(expression.value);
        switch (expression.key.nodeType) {
            case Token.RepeatedType: return `Map<${key},${val}>`;
            case Token.MapType: return `Map<${key},${val}>`;
        }

        return `{[key:${key}]: ${val}}`;
    }

    visitNumericEnum(expression: NumericEnumExpression): any {
        let e = `export enum ${ucFirst(expression.name)} {\n  `;
        e += expression.members.map(m => this.visit(m)).join(',\n  ');
        e += '\n};'
        return e
    }

    visitNumericEnumMember(expression: NumericEnumMemberExpression): any {
        return expression.name + (expression.value != null ? ' = ' + expression.value : '') 
    }
    visitStringEnum(expression: StringEnumExpression): any {
        let e = `export namespace ${ucFirst(expression.name)} {\n  `
        e += expression.members.map(m => this.visit(m)).join('\n  ');
        e += '\n};'
        return e
        /*let e = `type ${ucFirst(expression.name)} = string;\n`
        this.enumName = ucFirst(expression.name);
        e += expression.members.map(m => this.visit(m)).join('\n');
        return e;*/
    }
    visitStringEnumMember(expression: StringEnumMemberExpression): any {
        return `export const ${expression.name} = "${expression.value}";`;

    }

}
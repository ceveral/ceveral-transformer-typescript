"use strict";
const Path = require("path");
const ceveral_compiler_1 = require("ceveral-compiler");
const utils_1 = require("./utils");
class TypescriptVisitor extends ceveral_compiler_1.BaseVisitor {
    constructor() {
        super(...arguments);
        this.imports = {};
    }
    parse(item) {
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
            }];
    }
    visitPackage(item) {
        let include = [ceveral_compiler_1.Token.Record, ceveral_compiler_1.Token.NumericEnum, ceveral_compiler_1.Token.StringEnum];
        let records = item.children.filter(m => include.indexOf(m.nodeType) > -1).map(m => this.visit(m));
        return `// ${item.name}\n${records.join('\n\n')}\n`;
    }
    visitRecord(item) {
        let props = item.properties.map(m => this.visit(m));
        let c = !!item.get('tsclass');
        return `export ${c ? 'class' : 'interface'} ${utils_1.ucFirst(item.name)} {\n${props.join('\n')}\n}`;
    }
    visitProperty(item) {
        let type = this.visit(item.type);
        let isOptional = item.type.nodeType === ceveral_compiler_1.Token.OptionalType;
        return `  ${item.name}` + (isOptional ? '?' : '') + ": " + type + ';';
    }
    visitAnnotation(item) {
        return item;
    }
    visitType(item) {
        let type = item.type;
        if (type === ceveral_compiler_1.Type.Bytes) {
            throw new ceveral_compiler_1.ValidationError("Typescript: A field cannot be binary");
        }
        switch (type) {
            case ceveral_compiler_1.Type.Boolean: return "boolean";
            case ceveral_compiler_1.Type.String: return "string";
            case ceveral_compiler_1.Type.Date: return "Date";
            default: return "number";
        }
    }
    visitImportType(item) {
        if (!this.imports[item.packageName])
            this.imports[item.packageName] = new Set();
        this.imports[item.packageName].add(item.name);
        return item.name;
    }
    //visitPackage(expression: PackageExpression): any;
    visitRecordType(expression) {
        return expression.name;
    }
    visitOptionalType(expression) {
        return this.visit(expression.type);
    }
    visitRepeatedType(expression) {
        let type = this.visit(expression.type);
        return type + "[]";
    }
    visitMapType(expression) {
        let key = this.visit(expression.key);
        let val = this.visit(expression.value);
        switch (expression.key.nodeType) {
            case ceveral_compiler_1.Token.RepeatedType: return `Map<${key},${val}>`;
            case ceveral_compiler_1.Token.MapType: return `Map<${key},${val}>`;
        }
        return `{[key:${key}]: ${val}}`;
    }
    visitNumericEnum(expression) {
        let e = `export enum ${utils_1.ucFirst(expression.name)} {\n  `;
        e += expression.members.map(m => this.visit(m)).join(',\n  ');
        e += '\n};';
        return e;
    }
    visitNumericEnumMember(expression) {
        return expression.name + (expression.value != null ? ' = ' + expression.value : '');
    }
    visitStringEnum(expression) {
        let e = `export namespace ${utils_1.ucFirst(expression.name)} {\n  `;
        e += expression.members.map(m => this.visit(m)).join('\n  ');
        e += '\n};';
        return e;
        /*let e = `type ${ucFirst(expression.name)} = string;\n`
        this.enumName = ucFirst(expression.name);
        e += expression.members.map(m => this.visit(m)).join('\n');
        return e;*/
    }
    visitStringEnumMember(expression) {
        return `export const ${expression.name} = "${expression.value}";`;
    }
}
exports.TypescriptVisitor = TypescriptVisitor;

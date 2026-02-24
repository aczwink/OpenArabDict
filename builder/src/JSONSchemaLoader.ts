/**
 * OpenArabDict
 * Copyright (C) 2025 Amir Czwink (amir130@hotmail.de)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */
import { Dictionary } from "@aczwink/acts-util-core";
import fs from "fs";
import jsonschema from "jsonschema";
import path from "path";

export class JSONSchemaLoader
{
    constructor()
    {
        this.schemas = {};
    }

    public async Load(schemaFilePath: string)
    {
        await this.LoadSchema(schemaFilePath, ".");
    }

    public Validate(data: any, schemaFileTitle: string)
    {
        const schema = this.schemas[schemaFileTitle]!;

        const v = new jsonschema.Validator;
        for (const key in this.schemas)
        {
            const schema = this.schemas[key]!;
            const uri = "/" + key;
            v.addSchema(schema, uri);
        }
        const result = v.validate(data, schema);

        return result.valid;
    }

    //State
    private schemas: Dictionary<jsonschema.Schema>;

    //Private methods
    private async LoadSchema(schemaFilePath: string, schemasDirPath: string)
    {
        const parsed = path.parse(schemaFilePath);

        schemasDirPath = path.join(schemasDirPath, parsed.dir);
        const schemasBasePath = "../schemas";
        const resolvedFilePath = path.join(schemasDirPath, parsed.base);
        const realSchemaPath = path.join(schemasBasePath, resolvedFilePath);

        const schemaData = await fs.promises.readFile(realSchemaPath, "utf-8");
        const schema = JSON.parse(schemaData) as jsonschema.Schema;

        this.schemas[resolvedFilePath] = schema;
        await this.LoadSubSchemas(schema, schemasDirPath);
    }

    private async LoadSubSchemas(schema: jsonschema.Schema, schemasDirPath: string)
    {
        if(schema.$ref !== undefined)
        {
            if(schema.$ref !== "#")
                await this.LoadSchema(schema.$ref, schemasDirPath);
            return;
        }

        switch(schema.type)
        {
            case "boolean":
            case "integer":
            case "string":
                break;
            case "array":
                if(Array.isArray(schema.items))
                    throw new Error("TODO: ARRAY NOT IMPLEMENTED");
                await this.LoadSubSchemas(schema.items!, schemasDirPath);
                break;
            case "object":
                for (const key in schema.properties)
                {
                    const value = schema.properties[key];
                    await this.LoadSubSchemas(value, schemasDirPath);
                }
                break;
            default:
                if(schema.const !== undefined)
                    return;
                if(schema.enum !== undefined)
                    return;
                if(schema.oneOf !== undefined)
                {
                    for (const element of schema.oneOf)
                        await this.LoadSubSchemas(element, schemasDirPath);
                    return;
                }

                console.log(schema);
                throw new Error("TODO: " + schema.type);
        }
    }
}
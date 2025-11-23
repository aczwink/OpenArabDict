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
import fs from "fs";
import path from "path";
import YAML from 'yaml';
import { DBBuilder } from "./DBBuilder";
import { OpenArabDictWordRelationshipType } from "openarabdict-domain";
import { ProcessWordDefinition } from "./WordProcessor";
import { WordDefinition } from "./DataDefinitions";
import { CheckWords } from "./openarabicconjugation-tests-check";
import { VerbalNounCounter } from "./VerbalNounCounter";
import { JSONSchemaLoader } from "./JSONSchemaLoader";

interface DialectDefinition
{
    key: string;
    name: string;
    emojiCodes: string;
    iso639code: string;
    glottoCode: string;
    children?: DialectDefinition[];
}

interface RootDefinition
{
    radicals: string;
    ya?: boolean;
    words: WordDefinition[];
}

interface WordReference
{
    text: string;
}

interface WordRelationshipDefinition
{
    word1: WordReference;
    word2: WordReference;
    relationship: "synonym";
}

interface Catalog
{
    dialects: DialectDefinition[];
    relations: WordRelationshipDefinition[];
    roots: RootDefinition[];
    words: WordDefinition[];
}

function Validate(data: any, schemaFileTitle: string, schemaLoader: JSONSchemaLoader, dataFilePath: string)
{
    //TODO: add cli flag on whether to do schema validation or not
    /*const result = schemaLoader.Validate(data, schemaFileTitle);
    if(!result)
    {
        console.log(dataFilePath, "is not valid!");
    }
    */
}

async function CollectFiles(catalog: Catalog, dirPath: string)
{
    function ReadContent(content: string, ext: string)
    {
        switch(ext)
        {
            case "yml":
                return YAML.parse(content);
            default:
                throw new Error("Unsupported extension: " + ext);
        }
    }

    const schemaLoader = new JSONSchemaLoader;
    await schemaLoader.Load("OpenArabDictRoot.json");
    await schemaLoader.Load("words.json");

    const children = await fs.promises.readdir(dirPath);
    for (const child of children)
    {
        const childPath = path.join(dirPath, child);
        const result = await fs.promises.stat(childPath);
        if(result.isDirectory())
            await CollectFiles(catalog, childPath);
        else
        {
            const content = await fs.promises.readFile(childPath, "utf-8");
            const data = ReadContent(content, childPath.substring(childPath.length - 3));
            if(data.dialects !== undefined)
                catalog.dialects.push(...data.dialects);
            if(data.relations !== undefined)
                catalog.relations.push(...data.relations);
            if(data.root !== undefined)
            {
                Validate(data, "OpenArabDictRoot.json", schemaLoader, childPath);
                catalog.roots.push(data.root);
            }
            if(data.words !== undefined)
            {
                Validate(data, "words.json", schemaLoader, childPath);
                catalog.words.push(...data.words);
            }
        }
    }
}

function ProcessDialects(dialects: DialectDefinition[], parentId: number | null, builder: DBBuilder)
{
    for (const dialect of dialects)
    {
        const id = builder.AddDialect(dialect.key, dialect.name, dialect.emojiCodes, dialect.glottoCode, dialect.iso639code, parentId);

        if(dialect.children !== undefined)
            ProcessDialects(dialect.children, id, builder);
    }
}

function ResolveWordReference(ref: WordReference, builder: DBBuilder)
{
    const wordId = builder.FindWord({
        text: ref.text
    });
    return wordId;
}

async function BuildDatabase(dbSrcPath: string)
{
    const catalog: Catalog = {
        dialects: [],
        relations: [],
        roots: [],
        words: []
    };
    await CollectFiles(catalog, dbSrcPath);

    const builder = new DBBuilder;
    const verbalNounCounter = new VerbalNounCounter;

    ProcessDialects(catalog.dialects, null, builder);

    for (const root of catalog.roots)
    {
        const rootId = builder.AddRoot(root.radicals, root.ya);

        for (const word of root.words)
        {
            ProcessWordDefinition(word, builder, verbalNounCounter, {
                type: "root",
                rootId,
            });
        }
    }

    for (const word of catalog.words)
    {
        ProcessWordDefinition(word, builder, verbalNounCounter);
    }

    for (const relation of catalog.relations)
    {
        const word1Id = ResolveWordReference(relation.word1, builder);
        const word2Id = ResolveWordReference(relation.word2, builder);
        const type = (relation.relationship === "synonym") ? OpenArabDictWordRelationshipType.Synonym : OpenArabDictWordRelationshipType.Antonym;

        builder.AddRelation(word1Id, word2Id, type);
    }

    const document = await builder.Store("./dist/en.json");
    await CheckWords(document);
    verbalNounCounter.Evaluate();
}

const dbSrcPath = process.argv[2];
BuildDatabase(dbSrcPath);
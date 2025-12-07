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
import { GlobalInjector } from "acts-util-node";
import { StatisticsCounter, StatisticsCounterService } from "./services/StatisticsCounterService";

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
    roots: { data: RootDefinition; fileName: string; }[];
    words: { data: WordDefinition[]; fileName: string }[];
}

function Validate(data: any, schemaFileTitle: string, schemaLoader: JSONSchemaLoader, dataFilePath: string)
{
    const result = schemaLoader.Validate(data, schemaFileTitle);
    if(!result)
    {
        GlobalInjector.Resolve(StatisticsCounterService).Increment(StatisticsCounter.InvalidSourceFile);
        console.log(dataFilePath, "is not valid!");
    }
}

async function CollectFiles(catalog: Catalog, dirPath: string, schemaLoader: JSONSchemaLoader, validateSourceFiles: boolean)
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

    const children = await fs.promises.readdir(dirPath);
    for (const child of children)
    {
        const childPath = path.join(dirPath, child);
        const result = await fs.promises.stat(childPath);
        if(result.isDirectory())
            await CollectFiles(catalog, childPath, schemaLoader, validateSourceFiles);
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
                if(validateSourceFiles)
                    Validate(data, "OpenArabDictRoot.json", schemaLoader, childPath);
                catalog.roots.push({ data: data.root, fileName: childPath });
            }
            if(data.words !== undefined)
            {
                if(validateSourceFiles)
                    Validate(data, "words.json", schemaLoader, childPath);
                catalog.words.push({ data: data.words, fileName: childPath });
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

async function BuildDatabase(dbSrcPath: string, validateSourceFiles: boolean)
{
    const catalog: Catalog = {
        dialects: [],
        relations: [],
        roots: [],
        words: []
    };
    
    const schemaLoader = new JSONSchemaLoader;
    await schemaLoader.Load("OpenArabDictRoot.json");
    await schemaLoader.Load("words.json");
    
    await CollectFiles(catalog, dbSrcPath, schemaLoader, validateSourceFiles);

    const builder = new DBBuilder;
    const verbalNounCounter = new VerbalNounCounter;

    ProcessDialects(catalog.dialects, null, builder);

    for (const entry of catalog.roots)
    {
        const root = entry.data;

        const rootId = builder.AddRoot(root.radicals, root.ya);

        for (const word of root.words)
        {
            ProcessWordDefinition(word, builder, verbalNounCounter, {
                type: "root",
                rootId,
                fileName: entry.fileName
            });
        }
    }

    for (const block of catalog.words)
    {
        for (const word of block.data)
        {
            ProcessWordDefinition(word, builder, verbalNounCounter, { type: "word-collection", fileName: block.fileName });
        }
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

    GlobalInjector.Resolve(StatisticsCounterService).Print();
}

const dbSrcPath = process.argv[2];
const validateSourceFiles = !(process.argv[3] === "--skip-validation");
BuildDatabase(dbSrcPath, validateSourceFiles);
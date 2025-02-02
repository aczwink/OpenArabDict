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
import { Conjugator } from "openarabicconjugation/dist/Conjugator";
import { DBBuilder } from "./DBBuilder";
import { Gender, Numerus, Person, Tense, Voice } from "openarabicconjugation/dist/Definitions";
import { VerbRoot } from "openarabicconjugation/dist/VerbRoot";
import { DialectMapper } from "./DialectMapper";
import { GetDialectMetadata } from "openarabicconjugation/dist/DialectsMetadata";
import { VocalizedWordTostring } from "openarabicconjugation/dist/Vocalization";
import { OpenArabDictWordType } from "openarabdict-domain";

interface DialectDefinition
{
    key: string;
    name: string;
    emojiCodes: string;
    iso639code: string;
    glottoCode: string;
    children?: DialectDefinition[];
}

interface ParameterizedStemData
{
    number: number;
    parameters: string;
}

interface GenderedWordDefinition
{
    type: "adjective" | "noun";
    gender: "male" | "female";
    text: string;
    derived?: WordDefinition[];
}

interface OtherWordDefinition
{
    type: "preposition";
    text: string;
    derived?: WordDefinition[];
}

interface VerbWordDefinition
{
    type: "verb";
    dialect: string;
    stem: number | ParameterizedStemData;
    derived?: WordDefinition[];
}

type WordDefinition = GenderedWordDefinition | OtherWordDefinition | VerbWordDefinition;

interface RootDefinition
{
    radicals: string;
    words: WordDefinition[];
}

interface Catalog
{
    dialects: DialectDefinition[];
    roots: RootDefinition[];
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
            if(data.root !== undefined)
                catalog.roots.push(data.root);
        }
    }
}

function ProcessDialects(dialects: DialectDefinition[], parentId: number | null, builder: DBBuilder, dialectMapper: DialectMapper)
{
    for (const dialect of dialects)
    {
        const id = builder.AddDialect(dialect.key, dialect.name, dialect.emojiCodes, dialect.glottoCode, dialect.iso639code, parentId);
        dialectMapper.CreateMappingIfPossible(id, dialect.glottoCode, dialect.iso639code);

        if(dialect.children !== undefined)
            ProcessDialects(dialect.children, id, builder, dialectMapper);
    }
}

function ProcessWordDefinition(word: WordDefinition, builder: DBBuilder, dialectMapper: DialectMapper, root?: { radicals: string; id: number })
{
    console.log("Processing word: " + root?.radicals);
    switch(word.type)
    {
        case "adjective":
        case "noun":
        {
            builder.AddWord({
                id: 0,
                type: (word.type === "adjective") ? OpenArabDictWordType.Adjective : OpenArabDictWordType.Noun,
                isMale: word.gender === "male",
                text: word.text,
            });
        }
        break;
        case "preposition":
        {
            builder.AddWord({
                id: 0,
                type: OpenArabDictWordType.Preposition,
                text: word.text,
            });
        }
        break;
        case "verb":
        {
            const dialectId = builder.MapDialectKey(word.dialect)!;
            const dialectType = dialectMapper.Map(dialectId)!;

            const rootInstance = new VerbRoot(root!.radicals);

            const stemNumber = (typeof word.stem === "number") ? word.stem : word.stem.number;
            let stem1Context = undefined;
            if(typeof word.stem !== "number")
            {
                if(word.stem.number !== 1)
                    throw new Error("TODO: implement me");

                const meta = GetDialectMetadata(dialectType);
                stem1Context = meta.CreateStem1Context(rootInstance.type, word.stem.parameters);
            }

            const conjugator = new Conjugator;
            const vocalized = conjugator.Conjugate(rootInstance, {
                gender: Gender.Male,
                numerus: Numerus.Singular,
                person: Person.Third,
                tense: Tense.Perfect,
                voice: Voice.Active,
                stem: stemNumber as any,
                stem1Context
            }, dialectType);

            const conjugatedWord = VocalizedWordTostring(vocalized);

            builder.AddWord({
                id: 0,
                type: OpenArabDictWordType.Verb,
                dialectId,
                rootId: root!.id,
                stem: stemNumber,
                word: conjugatedWord,
                stemParameters: (typeof word.stem === "number") ? undefined : word.stem.parameters
            });
        }
        break;
    }

    if(word.derived !== undefined)
    {
        for (const child of word.derived)
        {
            ProcessWordDefinition(child, builder, dialectMapper);
        }
    }
}

async function BuildDatabase(dbSrcPath: string)
{
    const catalog: Catalog = {
        dialects: [],
        roots: []
    };
    await CollectFiles(catalog, dbSrcPath);

    const builder = new DBBuilder;
    const dialectMapper = new DialectMapper;

    ProcessDialects(catalog.dialects, null, builder, dialectMapper);

    for (const root of catalog.roots)
    {
        const rootId = builder.AddRoot(root.radicals);

        for (const word of root.words)
        {
            ProcessWordDefinition(word, builder, dialectMapper, {
                id: rootId,
                radicals: root.radicals.split("-").join("")
            });
        }
    }

    await builder.Store("./dist/db.json");
}

const dbSrcPath = process.argv[2];
BuildDatabase(dbSrcPath);
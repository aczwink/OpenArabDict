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
import { AdvancedStemNumber, Gender, Numerus, Person, Tense, Voice } from "openarabicconjugation/dist/Definitions";
import { VerbRoot } from "openarabicconjugation/dist/VerbRoot";
import { DialectMapper } from "./DialectMapper";
import { GetDialectMetadata } from "openarabicconjugation/dist/DialectsMetadata";
import { VocalizedWordTostring } from "openarabicconjugation/dist/Vocalization";
import { OpenArabDictNonVerbDerivationType, OpenArabDictVerbDerivationType, OpenArabDictWordParent, OpenArabDictWordParentType, OpenArabDictWordType } from "openarabdict-domain";
import { DialectType } from "openarabicconjugation/dist/Dialects";

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

interface TranslationDefinition
{
    dialect: string;
    source: "hw4-free-text";
    text: string[];
}

interface GenderedWordDefinition
{
    type: "adjective" | "noun" | "pronoun";
    derivation: "active-participle" | "passive-participle" | "verbal-noun";
    gender: "male" | "female";
    text?: string;
    translations: TranslationDefinition[];
    derived?: WordDefinition[];
}

interface OtherWordDefinition
{
    type: "adverb" | "conjunction" | "foreign-verb" | "interjection" | "particle" | "phrase" | "preposition";
    derivation: "extension";
    text: string;
    translations: TranslationDefinition[];
    derived?: WordDefinition[];
}

interface VerbWordDefinition
{
    type: "verb";
    dialect: string;
    stem: number | ParameterizedStemData;
    translations?: TranslationDefinition[];
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
    words: WordDefinition[];
}

interface RootParent
{
    type: "root";
    rootId: number;
}
interface VerbParent
{
    type: "verb";
    verbId: number;
}
interface WordWordParent
{
    type: "word";
    wordId: number;
}
type WordParent = RootParent | VerbParent | WordWordParent;

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
            if(data.words !== undefined)
                catalog.words.push(...data.words);
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

function GenerateTextIfPossible(word: GenderedWordDefinition, builder: DBBuilder, parent?: WordParent): string | undefined
{
    switch(word.derivation)
    {
        case "active-participle":
        case "passive-participle":
        {
            if(parent?.type !== "verb")
                throw new Error("Participles can only be children of verbs");
            const verb = builder.GetWord(parent.verbId);
            if(verb.type !== OpenArabDictWordType.Verb)
                throw new Error("Id error!!!");
            const root = builder.GetRoot(verb.rootId);

            const rootInstance = new VerbRoot(root.radicals);

            let stem1Ctx;
            if(verb.stemParameters !== undefined)
            {
                const meta = GetDialectMetadata(DialectType.ModernStandardArabic);
                stem1Ctx = meta.CreateStem1Context(rootInstance.type, verb.stemParameters!);
            }

            const voice = (word.derivation === "active-participle") ? Voice.Active : Voice.Passive;

            const conjugator = new Conjugator;
            const generated = conjugator.ConjugateParticiple(DialectType.ModernStandardArabic, rootInstance, verb.stem, voice, stem1Ctx);
            return VocalizedWordTostring(generated);
        }
        case "verbal-noun":
        {
            if(parent?.type !== "verb")
                throw new Error("Verbal nouns can only be children of verbs");
            const verb = builder.GetWord(parent.verbId);
            if(verb.type !== OpenArabDictWordType.Verb)
                throw new Error("Id error!!!");
            const root = builder.GetRoot(verb.rootId);

            const rootInstance = new VerbRoot(root.radicals);

            let stem;
            if(verb.stemParameters !== undefined)
            {
                const meta = GetDialectMetadata(DialectType.ModernStandardArabic);
                stem = meta.CreateStem1Context(rootInstance.type, verb.stemParameters!);
            }
            else
                stem = verb.stem as AdvancedStemNumber;

            const conjugator = new Conjugator;
            if(conjugator.HasPotentiallyMultipleVerbalNounForms(rootInstance, stem))
                return undefined;

            const generated = conjugator.GenerateAllPossibleVerbalNouns(rootInstance, stem);
            return VocalizedWordTostring(generated[0]);
        }
    }

    return undefined;
}

function ProcessWordDefinition(word: WordDefinition, builder: DBBuilder, dialectMapper: DialectMapper, parent?: WordParent)
{
    function MapType()
    {
        switch(word.type)
        {
            case "adjective":
                return OpenArabDictWordType.Adjective;
            case "adverb":
                return OpenArabDictWordType.Adverb;
            case "conjunction":
                return OpenArabDictWordType.Conjunction;
            case "foreign-verb":
                return OpenArabDictWordType.ForeignVerb;
            case "interjection":
                return OpenArabDictWordType.Interjection;
            case "noun":
                return OpenArabDictWordType.Noun;
            case "particle":
                return OpenArabDictWordType.Particle;
            case "phrase":
                return OpenArabDictWordType.Phrase;
            case "preposition":
                return OpenArabDictWordType.Preposition;
            case "pronoun":
                return OpenArabDictWordType.Pronoun;
            case "verb":
                return OpenArabDictWordType.Verb;
        }
    }

    function MapVerbDerivationType(derivation: string)
    {
        switch(derivation)
        {
            case "active-participle":
                return OpenArabDictVerbDerivationType.ActiveParticiple;
            case "meaning-related":
                return OpenArabDictVerbDerivationType.Unknown;
            case "passive-participle":
                return OpenArabDictVerbDerivationType.PassiveParticiple;
            case "verbal-noun":
                return OpenArabDictVerbDerivationType.VerbalNoun;
            default:
                throw new Error(derivation);
        }
    }

    function MapWordDerivationType(derivation: string)
    {
        switch(derivation)
        {
            case "adverbial-accusative":
                return OpenArabDictNonVerbDerivationType.AdverbialAccusative;
            case "colloquial":
                return OpenArabDictNonVerbDerivationType.Colloquial;
            case "elative-degree":
                return OpenArabDictNonVerbDerivationType.ElativeDegree;
            case "extension":
                return OpenArabDictNonVerbDerivationType.Extension;
            case "feminine":
                return OpenArabDictNonVerbDerivationType.Feminine;
            case "nisba":
                return OpenArabDictNonVerbDerivationType.Nisba;
            case "plural":
                return OpenArabDictNonVerbDerivationType.Plural;
            case "singulative":
                return OpenArabDictNonVerbDerivationType.Singulative;
            default:
                throw new Error(derivation);
        }
    }

    function MapParent(derivation: string, parent?: WordParent): OpenArabDictWordParent | undefined
    {
        switch(parent?.type)
        {
            case "root":
                return {
                    type: OpenArabDictWordParentType.Root,
                    rootId: parent.rootId
                };
            case "verb":
                return {
                    type: OpenArabDictWordParentType.Verb,
                    verbId: parent.verbId,
                    derivation: MapVerbDerivationType(derivation)
                };
            case "word":
                return {
                    type: OpenArabDictWordParentType.NonVerbWord,
                    wordId: parent.wordId,
                    relationType: MapWordDerivationType(derivation)
                }
        }
    }

    const translations = word.translations?.map(x => ({
        dialectId: builder.MapDialectKey(x.dialect)!,
        text: x.text
    })) ?? [];

    const t = MapType();
    let thisParent: WordParent | undefined = undefined;
    switch(t)
    {
        case OpenArabDictWordType.Adjective:
        case OpenArabDictWordType.Noun:
        case OpenArabDictWordType.Pronoun:
        {
            const g = word as GenderedWordDefinition;
            const generated = GenerateTextIfPossible(g, builder, parent);
            if((generated !== undefined) && (g.text !== undefined))
            {
                if(g.text === generated)
                    console.log("Redudant text definition of word: " + g.text);
                /*else TODO: enable me!
                    throw new Error("Wrong text definition for word. Expected: " + generated + ", got: " + g.text);*/
            }
            const text = generated ?? g.text;
            if(text === undefined)
                throw new Error("Missing text for word!");

            const wordId = builder.AddWord({
                id: 0,
                type: t,
                isMale: g.gender === "male",
                text,
                translations,
                parent: MapParent(g.derivation, parent)
            });

            thisParent = {
                type: "word",
                wordId
            };
        }
        break;
        case OpenArabDictWordType.Adverb:
        case OpenArabDictWordType.Conjunction:
        case OpenArabDictWordType.ForeignVerb:
        case OpenArabDictWordType.Interjection:
        case OpenArabDictWordType.Particle:
        case OpenArabDictWordType.Phrase:
        case OpenArabDictWordType.Preposition:
        {
            const o = word as OtherWordDefinition;
            const wordId = builder.AddWord({
                id: 0,
                type: t,
                text: o.text,
                translations,
                parent: MapParent(o.derivation, parent)
            });

            thisParent = {
                type: "word",
                wordId
            };
        }
        break;
        case OpenArabDictWordType.Verb:
        {
            if(parent?.type !== "root")
                throw new Error("Verbs must be direct children of a root");
            const root = builder.GetRoot(parent.rootId);

            const v = word as VerbWordDefinition;
            const dialectId = builder.MapDialectKey(v.dialect)!;
            const dialectType = dialectMapper.Map(dialectId)!;

            const rootInstance = new VerbRoot(root!.radicals);

            const stemNumber = (typeof v.stem === "number") ? v.stem : v.stem.number;
            let stem1Context = undefined;
            if(typeof v.stem !== "number")
            {
                if(v.stem.number !== 1)
                    throw new Error("TODO: implement me");

                const meta = GetDialectMetadata(dialectType);
                stem1Context = meta.CreateStem1Context(rootInstance.type, v.stem.parameters);
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

            const verbId = builder.AddWord({
                id: 0,
                type: OpenArabDictWordType.Verb,
                dialectId,
                rootId: root!.id,
                stem: stemNumber,
                text: conjugatedWord,
                stemParameters: (typeof v.stem === "number") ? undefined : v.stem.parameters,
                translations
            });

            thisParent = {
                type: "verb",
                verbId
            };
        }
        break;
    }

    if(word.derived !== undefined)
    {
        for (const child of word.derived)
        {
            ProcessWordDefinition(child, builder, dialectMapper, thisParent);
        }
    }
}

async function BuildDatabase(dbSrcPath: string)
{
    const catalog: Catalog = {
        dialects: [],
        roots: [],
        words: []
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
                type: "root",
                rootId,
            });
        }
    }

    for (const word of catalog.words)
    {
        ProcessWordDefinition(word, builder, dialectMapper);
    }

    await builder.Store("./dist/db.json");
}

const dbSrcPath = process.argv[2];
BuildDatabase(dbSrcPath);
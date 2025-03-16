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
import { AdvancedStemNumber, Gender, Numerus, Person, Tense, VerbType, Voice } from "openarabicconjugation/dist/Definitions";
import { VerbRoot } from "openarabicconjugation/dist/VerbRoot";
import { DialectMapper } from "./DialectMapper";
import { GetDialectMetadata } from "openarabicconjugation/dist/DialectsMetadata";
import { ParseVocalizedText, VocalizedWordTostring } from "openarabicconjugation/dist/Vocalization";
import { OpenArabDictNonVerbDerivationType, OpenArabDictVerbDerivationType, OpenArabDictWordParent, OpenArabDictWordParentType, OpenArabDictWordRelationshipType, OpenArabDictWordType } from "openarabdict-domain";
import { DialectType } from "openarabicconjugation/dist/Dialects";
import { Buckwalter } from "openarabicconjugation/dist/Transliteration";
import { EqualsAny } from "acts-util-core";
import { CreateVerb } from "openarabicconjugation/dist/Verb";

interface DialectDefinition
{
    key: string;
    name: string;
    emojiCodes: string;
    iso639code: string;
    glottoCode: string;
    children?: DialectDefinition[];
}

interface ParameterizedStem1Data
{
    stem: 1;
    parameters: string;
    type?: "sound";
}

interface ParameterizedAdvancedStemData
{
    stem: AdvancedStemNumber;
    type?: "sound";
}

type ParameterizedStemData = ParameterizedStem1Data | ParameterizedAdvancedStemData;

interface TranslationDefinition
{
    dialect: string;
    contextual?: { text: string; translation: string; }[];
    examples?: { text: string; translation: string; }[];
    complete?: true;
    source: "hw4-free-text";
    text: string[];
    url?: string;
}

interface GenderedWordDefinition
{
    type: "adjective" | "noun" | "numeral" | "pronoun";
    alias?: string;
    derivation: "active-participle" | "passive-participle" | "verbal-noun";
    gender: "male" | "female";
    text?: string;
    translations: TranslationDefinition[];
    derived?: WordDefinition[];
}

interface OtherWordDefinition
{
    type: "adverb" | "conjunction" | "foreign-verb" | "interjection" | "particle" | "phrase" | "preposition";
    alias?: string;
    derivation: "extension";
    text: string;
    translations: TranslationDefinition[];
    derived?: WordDefinition[];
}

interface VerbWordDefinition
{
    type: "verb";
    alias?: string;
    dialect: string;
    form: number | ParameterizedStemData;
    translations?: TranslationDefinition[];
    derived?: WordDefinition[];
    derivation?: "colloquial";
}

type WordDefinition = GenderedWordDefinition | OtherWordDefinition | VerbWordDefinition;

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

interface RootParent
{
    type: "root";
    rootId: string;
}
interface VerbParent
{
    type: "verb";
    verbId: string;
}
interface WordWordParent
{
    type: "word";
    wordId: string;
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
            if(data.relations !== undefined)
                catalog.relations.push(...data.relations);
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
            const verbType = (verb.soundOverride === true) ? VerbType.Sound : rootInstance.DeriveDeducedVerbType();
            const verbInstance = CreateVerb(DialectType.ModernStandardArabic, rootInstance, verb.stemParameters ?? verb.stem as any, verbType);

            const voice = (word.derivation === "active-participle") ? Voice.Active : Voice.Passive;

            const conjugator = new Conjugator;
            const generated = conjugator.ConjugateParticiple(verbInstance, voice);
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
            const verbInstance = CreateVerb(DialectType.ModernStandardArabic, rootInstance, verb.stemParameters ?? verb.stem as any);
            const stem = (verbInstance.stem === 1) ? verbInstance : verbInstance.stem;

            const conjugator = new Conjugator;
            if(conjugator.HasPotentiallyMultipleVerbalNounForms(rootInstance, stem))
                return undefined;

            const generated = conjugator.GenerateAllPossibleVerbalNouns(rootInstance, stem);
            return VocalizedWordTostring(generated[0]);
        }
    }

    return undefined;
}

let illegalVerbalNouns = 0;
function ValidateVerbalNoun(word: GenderedWordDefinition, builder: DBBuilder, parent: WordParent | undefined)
{
    if(parent?.type !== "verb")
        throw new Error("Verbal nouns can only be children of verbs");
    const verb = builder.GetWord(parent.verbId);
    if(verb.type !== OpenArabDictWordType.Verb)
        throw new Error("Id error!!!");
    const root = builder.GetRoot(verb.rootId);

    const rootInstance = new VerbRoot(root.radicals);
    const verbInstance = CreateVerb(DialectType.ModernStandardArabic, rootInstance, verb.stemParameters ?? verb.stem as any);
    const stem = (verbInstance.stem === 1) ? verbInstance : verbInstance.stem;

    const conjugator = new Conjugator;
    const generated = conjugator.GenerateAllPossibleVerbalNouns(rootInstance, stem);

    const parsed = ParseVocalizedText(word.text ?? "");
    for (const possible of generated)
    {
        if(EqualsAny(possible, parsed))
            return;
    }
    //throw new Error("Illegal verbal noun text definition for word. Got: " + word.text + ", " + Buckwalter.ToString(ParseVocalizedText(word.text!)));
    illegalVerbalNouns++;
    console.log("Illegal verbal noun text definition for word. Got: " + word.text + ", " + Buckwalter.ToString(ParseVocalizedText(word.text!)));
    console.log(illegalVerbalNouns);
    console.log(generated);
}


let redundantWords = 0;
function ProcessWordDefinition(word: WordDefinition, builder: DBBuilder, dialectMapper: DialectMapper, parent?: WordParent)
{
    function MapType()
    {
        switch(word.type as string)
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
            case "numeral":
                return OpenArabDictWordType.Numeral;
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
            default:
                throw new Error("Unknown word type: " + word.type);
        }
    }

    function MapVerbDerivationType(derivation: string)
    {
        switch(derivation)
        {
            case "active-participle":
                return OpenArabDictVerbDerivationType.ActiveParticiple;
            case "colloquial":
                return OpenArabDictVerbDerivationType.Colloquial;
            case "meaning-related":
                return OpenArabDictVerbDerivationType.MeaningRelated;
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
        complete: x.complete,
        contextual: x.contextual,
        examples: x.examples,
        text: x.text,
        url: x.url
    })) ?? [];

    const t = MapType();
    let thisParent: WordParent | undefined = undefined;
    let createdWordId;
    switch(t)
    {
        case OpenArabDictWordType.Adjective:
        case OpenArabDictWordType.Noun:
        case OpenArabDictWordType.Numeral:
        case OpenArabDictWordType.Pronoun:
        {
            const g = word as GenderedWordDefinition;
            const generated = GenerateTextIfPossible(g, builder, parent);
            if(g.text !== undefined)
            {
                if(generated !== undefined)
                {
                    if(g.text === generated)
                    {
                        redundantWords++;
                        console.log("Redundant text definition of word: " + g.text);
                    }
                    else
                        throw new Error("Wrong text definition for word. Expected: " + generated + ", got: " + g.text + ", Expected: " + Buckwalter.ToString(ParseVocalizedText(generated)) + ", got: " + Buckwalter.ToString(ParseVocalizedText(g.text)));
                }
                else if(g.derivation === "verbal-noun")
                    ValidateVerbalNoun(g, builder, parent);
            }
            const text = generated ?? g.text;
            if(text === undefined)
            {
                console.log(g);
                throw new Error("Missing text for word!");
            }

            const wordId = builder.AddWord({
                id: "",
                type: t,
                isMale: g.gender === "male",
                text,
                translations,
                parent: MapParent(g.derivation, parent)
            });

            if(g.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: g.type,
                    derivation: g.derivation,
                    gender: g.gender,
                    translations: g.translations,
                    derived: g.derived,
                    text: g.alias
                }, builder, dialectMapper, parent);

                builder.AddRelation(wordId, aliasWordId, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "word",
                wordId
            };
            createdWordId = wordId;
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
                id: "",
                type: t,
                text: o.text,
                translations,
                parent: MapParent(o.derivation, parent)
            });

            if(o.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: o.type,
                    derivation: o.derivation,
                    text: o.alias,
                    translations: o.translations,
                }, builder, dialectMapper, parent);

                builder.AddRelation(wordId, aliasWordId, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "word",
                wordId
            };
            createdWordId = wordId;
        }
        break;
        case OpenArabDictWordType.Verb:
        {
            let rootId;
            if(parent?.type === "root")
                rootId = parent.rootId;
            else if(parent?.type === "verb")
            {
                const parentWord = builder.GetWord(parent.verbId);
                if(parentWord.type !== OpenArabDictWordType.Verb)
                    throw new Error("ID ERROR!");
                rootId = parentWord.rootId;
            }
            else
                throw new Error("Verbs must be direct children of a root or a verb");
            const root = builder.GetRoot(rootId);

            const v = word as VerbWordDefinition;
            const dialectId = builder.MapDialectKey(v.dialect)!;
            const dialectType = dialectMapper.Map(dialectId)!;

            const rootInstance = new VerbRoot(root!.radicals);

            const stemNumber = (typeof v.form === "number") ? v.form : v.form.stem;
            let verb;
            if(typeof v.form !== "number")
            {
                const meta = GetDialectMetadata(dialectType);
                const verbType = (v.form.type === "sound") ? VerbType.Sound : undefined;
                const choices = meta.GetStem1ContextChoices(rootInstance);
                if((v.form.stem === 1) && !choices.types.includes(v.form.parameters))
                {
                    console.log(word, word.translations);
                    throw new Error("Wrong stem parameterization");
                }
                const stem = (v.form.stem === 1) ? v.form.parameters : v.form.stem;
                verb = CreateVerb(dialectType, rootInstance, stem, verbType);
            }
            else
                verb = CreateVerb(dialectType, rootInstance, v.form as AdvancedStemNumber);

            const conjugator = new Conjugator;
            const vocalized = conjugator.Conjugate(verb, {
                gender: Gender.Male,
                numerus: Numerus.Singular,
                person: Person.Third,
                tense: Tense.Perfect,
                voice: Voice.Active,
            });

            const conjugatedWord = VocalizedWordTostring(vocalized);

            const verbId = builder.AddWord({
                id: "",
                type: OpenArabDictWordType.Verb,
                dialectId,
                rootId: root!.id,
                stem: stemNumber,
                text: conjugatedWord,
                stemParameters: ((typeof v.form !== "number") && (v.form.stem === 1)) ? v.form.parameters : undefined,
                translations,
                soundOverride: ((typeof v.form !== "number") && (v.form.type !== undefined)) ? true : undefined,
                parent: MapParent(v.derivation!, parent) ?? ({ type: OpenArabDictWordParentType.Root, rootId: root.id})
            });

            if(v.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: v.type,
                    dialect: v.dialect,
                    form: {
                        stem: 1,
                        parameters: v.alias
                    },
                    translations: v.translations
                }, builder, dialectMapper, parent);

                builder.AddRelation(verbId, aliasWordId, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "verb",
                verbId
            };
            createdWordId = verbId;
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

    return createdWordId;
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
    const dialectMapper = new DialectMapper;

    ProcessDialects(catalog.dialects, null, builder, dialectMapper);

    for (const root of catalog.roots)
    {
        const rootId = builder.AddRoot(root.radicals, root.ya);

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

    for (const relation of catalog.relations)
    {
        const word1Id = ResolveWordReference(relation.word1, builder);
        const word2Id = ResolveWordReference(relation.word2, builder);
        const type = (relation.relationship === "synonym") ? OpenArabDictWordRelationshipType.Synonym : OpenArabDictWordRelationshipType.Antonym;

        builder.AddRelation(word1Id, word2Id, type);
    }

    await builder.Store("./dist/db.json");

    console.log("TODO: TOALLY CRAPPY VERBAL NOUNS:", illegalVerbalNouns);
    console.log("Redundant words:", redundantWords);
}

const dbSrcPath = process.argv[2];
BuildDatabase(dbSrcPath);
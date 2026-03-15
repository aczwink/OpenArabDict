/**
 * OpenArabDict
 * Copyright (C) 2025-2026 Amir Czwink (amir130@hotmail.de)
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

export interface OpenArabDictDialect
{
    id: number;
    name: string;
    emojiCodes: string;
    iso639code: string;
    glottoCode: string;
    parentId: number | null;
}

export interface OpenArabDictRoot
{
    id: string;
    radicals: string;
    //When for a defective root ending in waw, also an equivalent root with ya exists. Same for hollow
    ya?: boolean;
}

export enum UsageType
{
    Example,
    MeaningInContext
}

interface UsageRecord
{
    text: string;
    translation: string;
    type: UsageType;
}

export interface OpenArabDictTranslationEntry
{
    dialectId: number;
    complete?: true;
    text: string[];
    url?: string;
    usage?: UsageRecord[];
}

export enum OpenArabDictWordType
{
    Noun = 0,
    Preposition = 1,
    Adjective = 2,
    Conjunction = 3,
    /**
     * A verb that comes from an Arabic dialect or that was adopted by a foreign language and therefore does not base on a root, a stem etc.
     */
    ForeignVerb = 4,
    Adverb = 5,
    Pronoun = 6,
    Phrase = 7,
    Particle = 8,
    Interjection = 9,
    Verb = 10,
    Numeral = 11,
}

export enum OpenArabDictParentType
{
    /**
     * A word x has directed (outgoing) relations that has a target y.
     * The type describes the relationship.
     * Many relationships are parent-child relationships.
     */

    //Relation from x to y means: x is a direct child of root y.
    Root,

    //parent-child verb-only relationships
    //Relation from x to y means: x is the active participle of verb y.
    ActiveParticiple,
    //Relation from x to y means: x is related in meaning to verb y and is thus considered a direct child.
    MeaningRelated,
    //Relation from x to y means: x is the noun of place of verb y.
    NounOfPlace,
    //Relation from x to y means: x is the passive participle of verb y.
    PassiveParticiple,
    //Relation from x to y means: x is the tool noun of verb y.
    ToolNoun,
    //Relation from x to y means: x is the verbal noun of verb y.
    VerbalNoun,

    //parent(x) = y
    //Relation from x to y means: x is plural of y
    Plural,
    //Relation from x to y means: x is feminine version of male word y
    Feminine,
    //Relation from adjective x to noun y means: x is nisba of y
    Nisba,
    //Relation from x to y means: x is colloquial version of fus7a word y
    Colloquial,
    //Relation from x to y means: x is an extension of word y (for example taking a word to a further meaning in a phrase)
    Extension,
    //Relation from noun x to adjective y means: x is elative degree of y
    ElativeDegree,
    //Relation from x to y means: x is singulative of collective y
    Singulative,
    //Child is adverbial accusative of parent
    AdverbialAccusative,
    //Relation from x to y means: x is instance noun of verbal noun y
    InstanceNoun,
    //Relation from x to y means: x is the definite state of word y (i.e. adding the article al-)
    DefiniteState,

    //Relation from x to y means: x is a compound word (like a idafa) and is composed on word y.
    ComposedOf,
}

export interface OpenArabDictWordParent
{
    /**
     * In general the related word id.
     * If @member type is @constant OpenArabDictDirectionalRelationshipType.Root, then this is the root id.
     */
    id: string;
    type: OpenArabDictParentType;
}

interface OpenArabDictWordBase
{
    id: string;
    text: string;
    parent: OpenArabDictWordParent[];
}

export enum OpenArabDictGender
{
    Female,
    Male,
    FemaleOrMale,
}

export interface OpenArabDictGenderedWord extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Adjective | OpenArabDictWordType.Noun | OpenArabDictWordType.Numeral | OpenArabDictWordType.Pronoun;
    gender: OpenArabDictGender;
}

interface OpenArabDictOtherWord extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Adverb | OpenArabDictWordType.Conjunction | OpenArabDictWordType.ForeignVerb | OpenArabDictWordType.Interjection | OpenArabDictWordType.Particle | OpenArabDictWordType.Phrase | OpenArabDictWordType.Preposition;
}

export enum OpenArabDictVerbType
{
    Defective,
    Irregular,
    Sound,
}

interface VerbVariant
{
    dialectId: number;
    stemParameters: string;
    verbType?: OpenArabDictVerbType;
}

export interface OpenArabDictVerbForm
{
    hasPassive: boolean;
    stative?: boolean;
    stem: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
    variants?: VerbVariant[];
    verbType?: OpenArabDictVerbType;
}

export interface OpenArabDictVerb extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Verb;
    rootId: string;
    form: OpenArabDictVerbForm;
}

export type OpenArabDictWord = OpenArabDictGenderedWord | OpenArabDictOtherWord | OpenArabDictVerb;

export enum OpenArabDictWordRelationshipType
{
    Synonym = 0,
    Antonym = 1,
    EqualSpelling = 2,
}

export interface OpenArabDictWordRelation
{
    word1Id: string;
    word2Id: string;
    relationship: OpenArabDictWordRelationshipType;
}

export interface OpenArabDictDocument
{
    dialects: OpenArabDictDialect[];
    roots: OpenArabDictRoot[];
    words: OpenArabDictWord[];
    wordRelations: OpenArabDictWordRelation[];
}

export interface OpenArabDictTranslationDocument
{
    entries: {
        wordId: string;
        translations: OpenArabDictTranslationEntry[];
    }[];
}
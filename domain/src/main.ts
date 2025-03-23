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

interface TextWithTranslation
{
    text: string;
    translation: string;
}

export interface OpenArabDictTranslationEntry
{
    dialectId: number;
    contextual?: TextWithTranslation[];
    examples?: TextWithTranslation[];
    complete?: true;
    text: string[];
    url?: string;
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

interface OpenArabDictWordBase
{
    id: string;
    text: string;
    translations: OpenArabDictTranslationEntry[];
}

export enum OpenArabDictWordParentType
{
    Root = 0,
    Verb = 1,
    NonVerbWord = 2,
}

interface OpenArabDictWordRootParent
{
    type: OpenArabDictWordParentType.Root;
    rootId: string;
}

export enum OpenArabDictVerbDerivationType
{
    MeaningRelated = 0,
    VerbalNoun = 1,
    ActiveParticiple = 2,
    PassiveParticiple = 3,
    Colloquial = 4,
}

export interface OpenArabDictWordVerbParent
{
    type: OpenArabDictWordParentType.Verb;
    derivation: OpenArabDictVerbDerivationType;
    verbId: string;
}

export enum OpenArabDictNonVerbDerivationType
{
    //parent(x) = y

    //Relation from x to y means: x is plural of y
    Plural = 0,
    //Relation from x to y means: x is feminine version of male word y
    Feminine = 1,
    //Relation from adjective x to noun y means: x is nisba of y
    Nisba = 2,
    //Relation from x to y means: x is colloquial version of fus7a word y
    Colloquial = 3,
    //Relation from x to y means: x is an extension of word y (for example taking a word to a further meaning in a phrase)
    Extension = 4,
    //Relation from noun x to adjective y means: x is elative degree of y
    ElativeDegree = 5,
    //Relation from x to y means: x is singulative of collective y
    Singulative = 6,
    //Child is adverbial accusative of parent
    AdverbialAccusative = 7,
}

export interface OpenArabDictOtherWordParent
{
    type: OpenArabDictWordParentType.NonVerbWord;
    wordId: string;
    relationType: OpenArabDictNonVerbDerivationType;
}

export type OpenArabDictWordParent = OpenArabDictWordRootParent | OpenArabDictWordVerbParent | OpenArabDictOtherWordParent;

export interface OpenArabDictGenderedWord extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Adjective | OpenArabDictWordType.Noun | OpenArabDictWordType.Numeral | OpenArabDictWordType.Pronoun;
    isMale: boolean;
    parent?: OpenArabDictWordParent;
}

interface OpenArabDictOtherWord extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Adverb | OpenArabDictWordType.Conjunction | OpenArabDictWordType.ForeignVerb | OpenArabDictWordType.Interjection | OpenArabDictWordType.Particle | OpenArabDictWordType.Phrase | OpenArabDictWordType.Preposition;
    parent?: OpenArabDictWordParent;
}

export interface OpenArabDictVerb extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Verb;
    parent: OpenArabDictWordParent;
    rootId: string;
    dialectId: number;
    stem: number;
    soundOverride?: boolean;
    stemParameters?: string;
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
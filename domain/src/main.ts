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
    id: number;
    radicals: string;
    ya?: undefined;
}

interface OpenArabDictTranslationEntry
{
    dialectId: number;
    text: string[];
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
    Verb = 10
}

interface OpenArabDictWordBase
{
    id: number;
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
    rootId: number;
}

export enum OpenArabDictVerbDerivationType
{
    Unknown = 0,
    VerbalNoun = 1,
    ActiveParticiple = 2,
    PassiveParticiple = 3,
}

interface OpenArabDictWordVerbParent
{
    type: OpenArabDictWordParentType.Verb;
    derivation: OpenArabDictVerbDerivationType;
    verbId: number;
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

interface OpenArabDictOtherWordParent
{
    type: OpenArabDictWordParentType.NonVerbWord;
    wordId: number;
    relationType: OpenArabDictNonVerbDerivationType;
}

export type OpenArabDictWordParent = OpenArabDictWordRootParent | OpenArabDictWordVerbParent | OpenArabDictOtherWordParent;

interface OpenArabDictGenderedWord extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Adjective | OpenArabDictWordType.Noun | OpenArabDictWordType.Pronoun;
    isMale: boolean;
    parent?: OpenArabDictWordParent;
}

interface OpenArabDictOtherWord extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Adverb | OpenArabDictWordType.Conjunction | OpenArabDictWordType.ForeignVerb | OpenArabDictWordType.Interjection | OpenArabDictWordType.Particle | OpenArabDictWordType.Phrase | OpenArabDictWordType.Preposition;
    parent?: OpenArabDictWordParent;
}

interface OpenArabDictVerb extends OpenArabDictWordBase
{
    type: OpenArabDictWordType.Verb;
    rootId: number;
    dialectId: number;
    stem: number;
    stemParameters?: string;
}

export type OpenArabDictWord = OpenArabDictGenderedWord | OpenArabDictOtherWord | OpenArabDictVerb;

export enum OpenArabDictWordRelationshipType
{
    Synonym = 0,
    Antonym = 1,
}

interface OpenArabDictWordRelation
{
    word1Id: number;
    word2Id: number;
    relationship: OpenArabDictWordRelationshipType;
}

export interface OpenArabDictDocument
{
    dialects: OpenArabDictDialect[];
    roots: OpenArabDictRoot[];
    words: OpenArabDictWord[];
    wordRelations: OpenArabDictWordRelation[];
}
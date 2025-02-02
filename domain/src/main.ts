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

interface OpenArabDictGenderedWord
{
    id: number;
    type: OpenArabDictWordType.Adjective | OpenArabDictWordType.Noun;
    isMale: boolean;
    text: string;
}

interface OpenArabDictOtherWord
{
    id: number;
    type: OpenArabDictWordType.Preposition;
    text: string;
}

interface OpenArabDictVerb
{
    id: number;
    type: OpenArabDictWordType.Verb;
    word: string;
    rootId: number;
    dialectId: number;
    stem: number;
    stemParameters?: string;
}

export type OpenArabDictWord = OpenArabDictGenderedWord | OpenArabDictOtherWord | OpenArabDictVerb;

export interface OpenArabDictDocument
{
    dialects: OpenArabDictDialect[];
    roots: OpenArabDictRoot[];
    words: OpenArabDictWord[];
}
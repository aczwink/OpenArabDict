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

export enum OpenArabDictGender
{
    Female,
    Male,
    FemaleOrMale,
}

export enum OpenArabDictPOSType
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

export interface OpenArabDictGendered
{
    type: OpenArabDictPOSType.Adjective | OpenArabDictPOSType.Noun | OpenArabDictPOSType.Numeral | OpenArabDictPOSType.Pronoun;
    gender: OpenArabDictGender;
}

interface OpenArabDictOther
{
    type: OpenArabDictPOSType.Adverb | OpenArabDictPOSType.Conjunction | OpenArabDictPOSType.ForeignVerb | OpenArabDictPOSType.Interjection | OpenArabDictPOSType.Particle | OpenArabDictPOSType.Phrase | OpenArabDictPOSType.Preposition;
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

export interface OpenArabDictVerb
{
    type: OpenArabDictPOSType.Verb;
    rootId: string;
    form: OpenArabDictVerbForm;
}

export type OpenArabDictPartOfSpeech = OpenArabDictGendered | OpenArabDictOther | OpenArabDictVerb;
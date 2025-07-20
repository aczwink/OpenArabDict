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

import { AdvancedStemNumber } from "openarabicconjugation/dist/Definitions";

export interface TranslationDefinition
{
    dialect: string;
    contextual?: { text: string; translation: string; }[];
    examples?: { text: string; translation: string; }[];
    complete?: true;
    source: "hw4" | "hw4-free-text";
    text: string[];
    url?: string;
}

export interface GenderedWordDefinition
{
    type?: "adjective" | "noun" | "numeral" | "pronoun";
    alias?: string;
    derivation: "active-participle" | "feminine" | "passive-participle" | "plural" | "verbal-noun";
    gender?: "male" | "female";
    text?: string;
    translations: TranslationDefinition[];
    derived?: WordDefinition[];
}

export interface OtherWordDefinition
{
    type: "adverb" | "conjunction" | "foreign-verb" | "interjection" | "particle" | "phrase" | "preposition";
    alias?: string;
    derivation: "extension";
    text: string;
    translations: TranslationDefinition[];
    derived?: WordDefinition[];
}

export interface VerbVariantDefintion
{
    dialect: string;
}

export interface VerbVariantStem1Defintion extends VerbVariantDefintion
{
    parameters: string;
}

interface ParameterizedStem1Data
{
    stem: 1;
    parameters: string;
    type?: "defective" | "sound";
    "stative-active-participle"?: true;
}

interface ParameterizedStem1DataWithVariants
{
    stem: 1;
    type?: "defective" | "irregular" | "sound";
    variants?: VerbVariantStem1Defintion[];
}

interface ParameterizedAdvancedStemData
{
    stem: AdvancedStemNumber;
    type?: "sound";
    variants?: VerbVariantDefintion[];
}

export type ParameterizedStemData = ParameterizedStem1Data | ParameterizedStem1DataWithVariants | ParameterizedAdvancedStemData;

export interface VerbWordDefinition
{
    type: "verb";
    alias?: string;
    dialect: string;
    form: number | ParameterizedStemData;
    translations?: TranslationDefinition[];
    derived?: WordDefinition[];
    derivation?: "colloquial";
}

export type WordDefinition = GenderedWordDefinition | OtherWordDefinition | VerbWordDefinition;
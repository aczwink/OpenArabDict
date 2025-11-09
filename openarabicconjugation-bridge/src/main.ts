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

import { OpenArabDictRoot, OpenArabDictTranslationEntry, OpenArabDictVerb, OpenArabDictVerbForm, OpenArabDictVerbType } from "openarabdict-domain";
import { VerbType } from "openarabicconjugation/dist/Definitions";
import { DialectType } from "openarabicconjugation/dist/Dialects";
import { CreateVerb } from "openarabicconjugation/dist/Verb";
import { VerbRoot } from "openarabicconjugation/dist/VerbRoot";
import { DialectTree } from "./DialectTree";

export function CreateVerbFromOADVerbForm(dialectType: DialectType, rootRadicals: string, verbForm: OpenArabDictVerbForm)
{
    const rootInstance = new VerbRoot(rootRadicals);
    const dialectId = DialectTree.MapTypeToId(dialectType);

    let stem, verbType;
    if(verbForm.stem === 1)
    {
        const variant = verbForm.variants!.find(x => x.dialectId === dialectId)!;
        stem = variant.stemParameters;
        verbType = variant.verbType ?? verbForm.verbType;
    }
    else
    {
        stem = verbForm.stem;
        verbType = verbForm.verbType;
    }

    return CreateVerb(dialectType, rootInstance, stem, MapVerbTypeToOpenArabicConjugation(verbType));
}

export function CreateVerbFromOADVerb(dialectType: DialectType, root: OpenArabDictRoot, verb: OpenArabDictVerb)
{
    return CreateVerbFromOADVerbForm(dialectType, root.radicals, verb.form);
}

export function FindHighestConjugatableDialectOf(verbForm: OpenArabDictVerbForm, translations: OpenArabDictTranslationEntry[])
{
    const dialectIds = (verbForm.variants === undefined) ? translations.map(x => x.dialectId) : verbForm.variants.map(x => x.dialectId);
    const dialectTypes = dialectIds.map(x => DialectTree.MapIdToType(x)).filter(x => x !== undefined);
    if(dialectTypes.length === 0)
        return DialectType.ModernStandardArabic;
    return DialectTree.HighestOf(dialectTypes);
}

export function FindHighestConjugatableDialect(verb: OpenArabDictVerb)
{
    return FindHighestConjugatableDialectOf(verb.form, verb.translations);
}

export function MapVerbTypeToOpenArabicConjugation(verbType?: OpenArabDictVerbType): VerbType | undefined
{
    switch(verbType)
    {
        case OpenArabDictVerbType.Defective:
            return VerbType.Defective;
        case OpenArabDictVerbType.Irregular:
            return VerbType.Irregular;
        case OpenArabDictVerbType.Sound:
            return VerbType.Sound;
    }
    return undefined;
}

export { DialectTree };
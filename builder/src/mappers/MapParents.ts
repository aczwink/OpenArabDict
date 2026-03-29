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

import { OpenArabDictParentType, OpenArabDictWordParent } from "@aczwink/openarabdict-domain";
import { WordDefinition } from "../DataDefinitions";
import { TreeTrace } from "../TreeTrace";
import { WordDefinitionValidator } from "../WordDefinitionValidator";
import { DBBuilder } from "../DBBuilder";

function MapVerbDerivationType(derivation: string)
{
    switch(derivation)
    {
        case "active-participle":
            return OpenArabDictParentType.ActiveParticiple;
        case "colloquial":
            return OpenArabDictParentType.Colloquial;
        case "meaning-related":
            return OpenArabDictParentType.MeaningRelated;
        case "noun-of-place":
            return OpenArabDictParentType.NounOfPlace;
        case "passive-participle":
            return OpenArabDictParentType.PassiveParticiple;
        case "tool-noun":
            return OpenArabDictParentType.ToolNoun;
        case "verbal-noun":
            return OpenArabDictParentType.VerbalNoun;
        default:
            throw new Error(derivation);
    }
}

function MapWordDerivationType(derivation: string)
{
    switch(derivation)
    {
        case "adverbial-accusative":
            return OpenArabDictParentType.AdverbialAccusative;
        /*case "characteristic-noun": //TODO
            return OpenArabDictParentType.CharacteristicNoun;*/
        case "colloquial":
            return OpenArabDictParentType.Colloquial;
        case "definite-state":
            return OpenArabDictParentType.DefiniteState;
        case "elative-degree":
            return OpenArabDictParentType.ElativeDegree;
        case "extension":
            return OpenArabDictParentType.Extension;
        case "feminine":
            return OpenArabDictParentType.Feminine;
        case "instance-noun":
            return OpenArabDictParentType.InstanceNoun;
        case "nisba":
            return OpenArabDictParentType.Nisba;
        case "plural":
            return OpenArabDictParentType.Plural;
        case "singulative":
            return OpenArabDictParentType.Singulative;
        default:
            throw new Error(derivation);
    }
}

function MapParent(derivation?: string, parent?: TreeTrace): OpenArabDictWordParent | undefined
{
    switch(parent?.type)
    {
        case "root":
            return {
                id: parent.rootId,
                type: OpenArabDictParentType.Root
            };
        case "verb":
            return {
                id: parent.verbId,
                type: MapVerbDerivationType(derivation!)
            };
        case "word":
            return {
                id: parent.word.id,
                type: MapWordDerivationType(derivation!)
            };
    }
}

function FetchParents(derivation?: string, parent?: TreeTrace)
{
    const result = MapParent(derivation, parent);
    if(result === undefined)
        return [];
    return [result];
}

export function MapParents(builder: DBBuilder, wordDefinition: WordDefinition, validator: WordDefinitionValidator)
{
    const parents = FetchParents(wordDefinition.derivation, validator.sourceTreeTrace);

    if(("derived-from" in wordDefinition) && (wordDefinition["derived-from"] !== undefined))
    {
        for (const link of wordDefinition["derived-from"])
        {
            //if(link.derivation !== "composed-of")
            
            const wordId = builder.LookupUserWordId(link.ref);
            parents.push({
                id: wordId,
                type: OpenArabDictParentType.ComposedOf
            });
        }
    }

    validator.parents = parents;
}
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

import { OpenArabDictGender, OpenArabDictRoot, OpenArabDictVerb, OpenArabDictWordType } from "@aczwink/openarabdict-domain";
import { TreeTrace } from "./TreeTrace";
import { DBBuilder } from "./DBBuilder";
import { CreateVerbFromOADVerb } from "@aczwink/openarabdict-openarabicconjugation-bridge";
import { DialectType } from "@aczwink/openarabicconjugation";
import { Gender } from "@aczwink/openarabicconjugation/dist/Definitions";

export function CreateMSAVerb(root: OpenArabDictRoot, verb: OpenArabDictVerb)
{
    return CreateVerbFromOADVerb(DialectType.ModernStandardArabic, root, verb);
}

export function ExtractRoot(builder: DBBuilder, parent?: TreeTrace)
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

    return root;
}

export function _TODO_MapGender(gender: OpenArabDictGender): Gender //TODO: use bridge instead
{
    switch(gender)
    {
        case OpenArabDictGender.Female:
            return Gender.Female;
        case OpenArabDictGender.FemaleOrMale:
        case OpenArabDictGender.Male:
            return Gender.Male;
    }
}
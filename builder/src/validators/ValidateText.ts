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
import { WordDefinitionValidator } from "../WordDefinitionValidator";
import { DBBuilder } from "../DBBuilder";
import { OpenArabDictGender, OpenArabDictParentType, OpenArabDictRoot, OpenArabDictVerb, OpenArabDictWordType } from "@aczwink/openarabdict-domain";
import { CreateVerbFromOADVerb } from "@aczwink/openarabdict-openarabicconjugation-bridge";
import { Conjugator, DialectType, TargetVerbBasedDerivationPatterns } from "@aczwink/openarabicconjugation";
import { ParseVocalizedText } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { TargetNounBasedDerivationPatterns } from "@aczwink/openarabicconjugation/dist/Conjugator";
import { TargetAdjectiveNounDerivation } from "@aczwink/openarabicconjugation/dist/DialectConjugator";
import { Gender } from "@aczwink/openarabicconjugation/dist/Definitions";

function CreateMSAVerb(root: OpenArabDictRoot, verb: OpenArabDictVerb)
{
    return CreateVerbFromOADVerb(DialectType.ModernStandardArabic, root, verb);
}

export function ValidateText(builder: DBBuilder, validator: WordDefinitionValidator)
{
    switch(validator.sourceTreeTrace?.type)
    {
        case "verb":
        {
            const verb = builder.GetWord(validator.sourceTreeTrace.verbId);
            if(verb.type !== OpenArabDictWordType.Verb)
                throw new Error("Id error!!!");
            const root = builder.GetRoot(verb.rootId);

            const verbInstance = CreateMSAVerb(root, verb);

            const conjugator = new Conjugator();

            for (const parent of validator.parents)
            {
                let generated;
                switch(parent.type)
                {
                    case OpenArabDictParentType.NounOfPlace:
                        //TODO: fix this
                        //generated = conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.NounOfPlace);
                        break;
                    case OpenArabDictParentType.ToolNoun:
                        generated = conjugator.DeriveFromVerb(verbInstance, TargetVerbBasedDerivationPatterns.ToolNouns);
                        break;
                }
                
                if(generated !== undefined)
                    validator.ValidateAnyOf("text", generated);
            }
        }
        break;
        case "word":
        {
            for (const parent of validator.parents)
            {
                const parentWord = builder.GetWord(parent.id);
                const parsed = ParseVocalizedText(parentWord.text);

                let generated;
                switch(parent.type)
                {
                    case OpenArabDictParentType.Nisba:
                    {
                        const gender = ("gender" in parentWord) ? parentWord.gender : OpenArabDictGender.Male;

                        const conjugator = new Conjugator();
                        const noun = conjugator.DeriveSoundAdjectiveOrNoun(parsed, (gender === OpenArabDictGender.Male) ? Gender.Male : Gender.Female, TargetAdjectiveNounDerivation.DeriveNisbaSameGender, DialectType.ModernStandardArabic);
                        //TODO: fix this
                        //generated = [noun];
                    }
                    break;
                    case OpenArabDictParentType.Plural:
                    {
                        const conjugator = new Conjugator();
                        //TODO: fix this
                        //generated = conjugator.DeriveFromNoun(parsed, TargetNounBasedDerivationPatterns.PluralPatterns);
                    }
                    break;
                }

                if(generated !== undefined)
                    validator.ValidateAnyOf("text", generated);
            }
        }
        break;
    }
}
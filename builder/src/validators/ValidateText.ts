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
import { OpenArabDictGender, OpenArabDictParentType } from "@aczwink/openarabdict-domain";
import { Conjugator, DialectType } from "@aczwink/openarabicconjugation";
import { ParseVocalizedText } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { TargetAdjectiveNounDerivation } from "@aczwink/openarabicconjugation/dist/DialectConjugator";
import { Gender } from "@aczwink/openarabicconjugation/dist/Definitions";
import { GenerateAllPossibleTextsFromDerivation } from "../shared";

export function ValidateText(builder: DBBuilder, validator: WordDefinitionValidator)
{
    for (const parent of validator.parents)
    {
        const generated = GenerateAllPossibleTextsFromDerivation(parent, builder)                
        if(generated !== undefined)
            validator.ValidateAnyOf("text", generated);
    }

    switch(validator.sourceTreeTrace?.type)
    {
        case "word":
        {
            for (const parent of validator.parents)
            {
                const parentWord = builder.GetLexeme(parent.id);
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
                }

                if(generated !== undefined)
                    validator.ValidateAnyOf("text", generated);
            }
        }
        break;
    }
}
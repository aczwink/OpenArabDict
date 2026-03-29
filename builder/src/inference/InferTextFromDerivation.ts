/**
 * OpenArabDict
 * Copyright (C) 2026 Amir Czwink (amir130@hotmail.de)
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

import { OpenArabDictParentType } from "@aczwink/openarabdict-domain";
import { WordDefinitionValidator } from "../WordDefinitionValidator";
import { Conjugator, DialectType } from "@aczwink/openarabicconjugation";
import { DBBuilder } from "../DBBuilder";
import { AdjectiveOrNounState, Case, Gender, Numerus } from "@aczwink/openarabicconjugation/dist/Definitions";
import { ParseVocalizedText } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { TargetAdjectiveNounDerivation } from "@aczwink/openarabicconjugation/dist/DialectConjugator";

export function InferTextFromDerivation(builder: DBBuilder, validator: WordDefinitionValidator)
{
    const c = new Conjugator;

    for (const parent of validator.parents)
    {
        switch(parent.type)
        {
            case OpenArabDictParentType.AdverbialAccusative:
            {
                const parentWord = builder.GetWord(parent.id);
                
                const generated = c.DeclineAdjectiveOrNoun({
                    gender: Gender.Male,
                    isDefinite: false,
                    numerus: Numerus.Singular,
                    vocalized: ParseVocalizedText(parentWord.text),
                }, { case: Case.Accusative, state: AdjectiveOrNounState.Indefinite }, DialectType.ModernStandardArabic);
                //validator.InferValue("text", generated); //TODO: doesn't work for now
            }
            break;
            case OpenArabDictParentType.Feminine:
            {
                const parentWord = builder.GetWord(parent.id);

                const generated = c.DeriveSoundAdjectiveOrNoun(ParseVocalizedText(parentWord.text), Gender.Male, TargetAdjectiveNounDerivation.DeriveFeminineSingular, DialectType.ModernStandardArabic);
                validator.InferDefault("text", generated);
            }
            break;
        }
    }
}
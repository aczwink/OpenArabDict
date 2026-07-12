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
import { ArabicText, Conjugator, DialectType } from "@aczwink/openarabicconjugation";
import { DBBuilder } from "../DBBuilder";
import { AdjectiveOrNounState, Case, Gender, Numerus } from "@aczwink/openarabicconjugation/dist/Definitions";
import { TargetAdjectiveNounDerivation } from "@aczwink/openarabicconjugation/dist/DialectConjugator";
import { GenerateAllPossibleTextsFromDerivation } from "../shared";
import { Mapping } from "@aczwink/openarabdict-openarabicconjugation-bridge";
import { WordDefinitionValidator } from "../validation/WordDefinitionValidator";

export function InferTextFromDerivation(builder: DBBuilder, validator: WordDefinitionValidator)
{
    const c = new Conjugator;

    for (const parent of validator.parents)
    {
        switch(parent.type)
        {
            case OpenArabDictParentType.AdverbialAccusative:
            {
                const parentWord = builder.GetLexemeFromLexicalUnitId(parent.id);
                const pos = parentWord.senses[0].units[0].pos;
                if(!("gender" in pos))
                    continue;

                const generated = c.DeclineAdjectiveOrNoun({
                    gender: Mapping.MapGender(pos.gender),
                    isDefinite: false,
                    numerus: Numerus.Singular,
                    vocalized: ArabicText.ReconstructFullyVocalizedWord(parentWord.text),
                }, { case: Case.Accusative, state: AdjectiveOrNounState.Indefinite }, DialectType.ModernStandardArabic);
                validator.InferValue("text", generated);
            }
            break;
            case OpenArabDictParentType.Feminine:
            {
                const parentWord = builder.GetLexemeFromLexicalUnitId(parent.id);

                const reconstructed = ArabicText.ReconstructFullyVocalizedWord(parentWord.text);
                const generated = c.DeriveSoundAdjectiveOrNoun(reconstructed, Gender.Male, TargetAdjectiveNounDerivation.DeriveFeminineSingular, DialectType.ModernStandardArabic);
                validator.InferDefault("text", generated);
            }
            break;
        }
        
        const generated = GenerateAllPossibleTextsFromDerivation(parent, builder);
        if(generated?.length === 1)
            validator.InferValue("text", generated[0]);

        switch(parent.type)
        {
            case OpenArabDictParentType.Plural:
                if(generated?.length !== undefined)
                    validator.InferDefault("text", generated[0]);
                break;
        }
    }
}
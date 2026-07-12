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
import { Dialects } from "@aczwink/openarabicconjugation";
import { OpenArabDictVerbType } from "@aczwink/openarabdict-domain";
import { ParameterizedStemData, VerbVariantDefintion } from "../DataDefinitions";
import { DBBuilder } from "../DBBuilder";
import { ExtractRoot } from "../shared";
import { VerbRoot } from "@aczwink/openarabicconjugation/dist/VerbRoot";
import { _LegacyExtractDialect } from "../_LegacyDataDefinition";
import { DialectTree, MapVerbTypeToOpenArabicConjugation } from "@aczwink/openarabdict-openarabicconjugation-bridge";
import { GlobalInjector } from "@aczwink/acts-util-node";
import { StatisticsCounterService, StatisticsCounter } from "../services/StatisticsCounterService";
import { WordDefinitionValidator } from "../validation/WordDefinitionValidator";
import { AdvancedStemNumber } from "@aczwink/openarabicconjugation/dist/Definitions";

function MapVerbType(form: ParameterizedStemData)
{
    if(("type" in form))
    {
        switch(form.type)
        {
            case "irregular":
                return OpenArabDictVerbType.Irregular;
            case "sound":
                return OpenArabDictVerbType.Sound;
        }
    }
    return undefined;
}

function MapVerbTypeFromVariant(variant: VerbVariantDefintion)
{
    if(variant.type === undefined)
        return undefined;
    switch(variant.type)
    {
        case "defective":
            return OpenArabDictVerbType.Defective;
        case "irregular":
            return OpenArabDictVerbType.Irregular;
        case "sound":
            return OpenArabDictVerbType.Sound;
    }
    return undefined;
}

function ValidateVerbFormVariant(builder: DBBuilder, validator: WordDefinitionValidator, stem: 1 | AdvancedStemNumber, variant: VerbVariantDefintion)
{
    const dialectId = builder.MapDialectKey(variant.dialect)!;

    const root = ExtractRoot(builder, validator.sourceTreeTrace);
    const rootInstance = new VerbRoot(root!.radicals);
    
    const dialectType = DialectTree.MapIdToType(dialectId)!;
    const oadVerbType = MapVerbTypeFromVariant(variant);

    if(stem === 1)
    {
        const verbType = MapVerbTypeToOpenArabicConjugation(oadVerbType);
        const meta = Dialects.GetDialectMetadata(dialectType);
        const parameters = variant.parameters;

        if(parameters === undefined)
            throw new Error("Parameters are required on stem 1!");

        const defVerbType = verbType ?? meta.DeriveVerbType(rootInstance, (stem === 1) ? parameters : stem);

        const choices = meta.GetStem1ContextChoices(defVerbType, rootInstance);
        if(!choices.types.includes(parameters))
        {
            console.log(validator._legacyWordDefinition, root.radicals, variant);
            throw new Error("Wrong stem parameterization");
        }
    }

    return {
        dialectId,
        stemParameters: variant.parameters,
        verbType: oadVerbType
    };
}

export function ValidateVerbForm(builder: DBBuilder, validator: WordDefinitionValidator)
{
    const def = validator._legacyWordDefinition;

    if(!("type" in def))
        return;
    if(def.type !== "verb")
        return;

    if(typeof def.form === "number")
    {
        validator.verbForm = {
            hasPassive: false,
            stem: def.form,
        };
    }
    else if("parameters" in def.form)
    {
        const statsService = GlobalInjector.Resolve(StatisticsCounterService);
        statsService.Increment(StatisticsCounter.LegacyVerbParameters);

        validator.verbForm = {
            hasPassive: false,
            stem: def.form.stem,
            variants: [
                ValidateVerbFormVariant(builder, validator, def.form.stem, ({ dialect: _LegacyExtractDialect(def), parameters: def.form.parameters }))
            ]
        }
    }
    else
    {
        validator.verbForm = {
            hasPassive: MapPassiveFlag(def.form),
            stative: ExtractStativeFlag(def.form),
            stem: def.form.stem,
            variants: def.form.variants?.map(ValidateVerbFormVariant.bind(undefined, builder, validator, def.form.stem)),
            verbType: MapVerbType(def.form)
        };
    }
}

function ExtractStativeFlag(form: ParameterizedStemData): true | undefined
{
    if("stative" in form)
        return form.stative;
    return undefined;
}

function MapPassiveFlag(form: ParameterizedStemData): boolean
{
    if("valency" in form)
    {
        switch(form.valency)
        {
            case "transitive":
                return true;
        }
    }
    return false;
}
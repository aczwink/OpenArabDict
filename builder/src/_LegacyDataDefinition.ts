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

import { GlobalInjector } from "@aczwink/acts-util-node";
import { TranslationDefinition, VerbWordDefinition } from "./DataDefinitions";
import { StatisticsCounter, StatisticsCounterService } from "./services/StatisticsCounterService";
import { UsageType } from "@aczwink/openarabdict-domain";

export interface _LegacyParameterizedStem1Data
{
    stem: 1;
    parameters: string;
}

export function _LegacyExtractDialect(def: VerbWordDefinition)
{
    if("dialect" in def)
    {
        const statsService = GlobalInjector.Resolve(StatisticsCounterService);
        statsService.Increment(StatisticsCounter.LegacyDialect);
        return def.dialect as string;
    }
    return "msa";
}

export function _LegacyBuildUsage(x: TranslationDefinition)
{
    const ctx = x.contextual?.map(y => ({ text: y.text, translation: y.translation, type: UsageType.MeaningInContext }));
    const ex = x.examples?.map(y => ({ text: y.text, translation: y.translation, type: UsageType.Example }));

    const statsService = GlobalInjector.Resolve(StatisticsCounterService);

    if(ctx !== undefined)
    {
        statsService.Increment(StatisticsCounter.LegacyContextual);
        if(ex !== undefined)
        {
            statsService.Increment(StatisticsCounter.LegagyExamples);
            return ctx.concat(ex);
        }

        return ctx;
    }
    else if(ex !== undefined)
    {
        statsService.Increment(StatisticsCounter.LegagyExamples);
        return ex;
    }

    return undefined;
}
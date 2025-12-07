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
import { Injectable } from "acts-util-node";

export enum StatisticsCounter
{
    InvalidSourceFile,
    LegacyContextual,
    LegacyDialect,
    LegagyExamples,
    LegacyVerbParameters,
    RedundantAssignment
}

@Injectable
export class StatisticsCounterService
{
    constructor()
    {
        this.counters = new Map();
    }

    public Increment(counter: StatisticsCounter)
    {
        const count = this.counters.get(counter);
        this.counters.set(counter, (count ?? 0) + 1);
    }

    public Print()
    {
        console.log("Statistics counters: ");
        this.counters.Entries().ForEach(kv => {
            console.log(this.CounterToString(kv.key) + ":", kv.value);
            if(kv.value === 0)
                throw new Error("HEY THERE IS CODE THAT NEEDS TO BE REMOVED :)");
        });
    }

    //State
    private counters: Map<StatisticsCounter, number>;

    //Private methods
    private CounterToString(counter: StatisticsCounter): string
    {
        switch(counter)
        {
            case StatisticsCounter.InvalidSourceFile:
                return "invalid source file";
            case StatisticsCounter.LegacyContextual:
                return "contextual in translations";
            case StatisticsCounter.LegacyDialect:
                return "dialect in verbs";
            case StatisticsCounter.LegagyExamples:
                return "examples in translations";
            case StatisticsCounter.LegacyVerbParameters:
                return "parameters and stem:1 directly in form of verb";
            case StatisticsCounter.RedundantAssignment:
                return "redundant assignments";
        }
    }
}
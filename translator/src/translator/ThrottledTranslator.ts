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

import { OpenArabDictTranslationEntry } from "@aczwink/openarabdict-domain";
import { TargetTranslationLanguage, TranslationError, Translator } from "../Translator";

export class ThrottledTranslator implements Translator
{
    constructor(private inner: Translator, private maxTranslations?: number)
    {
        this._translatedCount = 0;
    }

    //Properties
    public get translatedCount()
    {
        return this._translatedCount;
    }

    //Public methods
    public async Translate(lexicalUnitId: string, translations: OpenArabDictTranslationEntry[], targetLanguage: TargetTranslationLanguage): Promise<OpenArabDictTranslationEntry[] | TranslationError>
    {
        if(this._translatedCount === this.maxTranslations)
            return TranslationError.Throttled;

        const result = await this.inner.Translate(lexicalUnitId, translations, targetLanguage);

        this._translatedCount++;

        return result;
    }

    //State
    private _translatedCount: number;
}
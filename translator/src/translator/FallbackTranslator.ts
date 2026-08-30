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

export class FallbackTranslator implements Translator
{
    constructor(private primary: Translator, private fallback: Translator)
    {
    }

    public async Translate(lexicalUnitId: string, translations: OpenArabDictTranslationEntry[], targetLanguage: TargetTranslationLanguage): Promise<OpenArabDictTranslationEntry[] | TranslationError>
    {
        const result = await this.primary.Translate(lexicalUnitId, translations, targetLanguage);
        if(Array.isArray(result))
            return result;

        return await this.fallback.Translate(lexicalUnitId, translations, targetLanguage);
    }
}
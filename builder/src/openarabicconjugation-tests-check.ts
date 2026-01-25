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

import { OpenArabDictDocument, OpenArabDictVerb, OpenArabDictVerbDerivationType, OpenArabDictVerbType, OpenArabDictWordParentType } from "openarabdict-domain";
import { Letter } from "openarabicconjugation/dist/Definitions";

function ExtractParameters(verb: OpenArabDictVerb)
{
    if(verb.form.variants === undefined)
        return undefined;
    return verb.form.variants[0]?.stemParameters;
}

export async function CheckWords(doc: OpenArabDictDocument)
{
    for (const word of doc.words)
    {
        //test: arb/assimilated_waw/stem10.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);

            if(root?.radicals.startsWith("و") && (verb.form.stem === 10))
            {
                console.log("FOUND1", word);
            }
        }

        //test: arb/assimilated_waw/stem4.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);

            if(root?.radicals.startsWith("و") && (verb.form.stem === 4))
            {
                console.log("FOUND10", word);
            }
        }

        //test: arb/assimilated/stem1_type_ia.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isr2d = root.radicals[1] === root.radicals[2];
            const verbType = (verb.form.variants === undefined) ? verb.form.verbType : verb.form.variants![0].verbType;

            if(root?.radicals.startsWith("و") && (ExtractParameters(verb) === "ia") && !isr2d && (verbType === undefined))
            {
                console.log("FOUND11", word, verb.form);
            }
        }

        //test: arb/defective/stem1_r3waw_type3.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.PassiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);

            if((root?.radicals === "ندو") && (ExtractParameters(verb) === "ia"))
            {
                console.log("FOUND2", word);
            }
        }

        //test: arb/defective/stem6.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isDefective = (root?.radicals.endsWith("و")) || (root?.radicals.endsWith("ي"));

            if(isDefective && (verb.form.stem === 6))
            {
                console.log("FOUND5", word);
            }
        }

        //test: arb/defective/stem7.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isDefective = (root?.radicals.endsWith("و")) || (root?.radicals.endsWith("ي"));

            if(isDefective && (verb.form.stem === 7))
            {
                console.log("FOUND6", word);
            }
        }

        //test: arb/doubly_weak/r1hamza_r3ya.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const startsWithHamza = (root?.radicals.startsWith("ء"));
            const endsInYa = root?.radicals.endsWith("ي");

            if(startsWithHamza && endsInYa && (verb.form.stem === 1))
            {
                console.log("FOUND7", word);
            }
        }

        //test: arb/doubly_weak/r1waw_r3waworya_stem4.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const startsWithWaw = (root?.radicals.startsWith("و"));
            const isDefective = (root?.radicals.endsWith("و")) || (root?.radicals.endsWith("ي"));

            if(startsWithWaw && isDefective && (verb.form.stem === 4))
            {
                console.log("FOUND7", word);
            }
        }

        //test: arb/doubly_weak/r2ya_r3hamza.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const middleYa = (root?.radicals[1] === "ي");
            const endHamza = root?.radicals.endsWith("ء");

            if(middleYa && endHamza)
            {
                console.log("FOUND8", word);
            }
        }

        //test: arb/hamza_on_r1/stem8.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isHr1 = (root?.radicals.startsWith("ء"));

            if(isHr1 && (verb.form.stem === 8))
            {
                console.log("FOUND9", word);
            }
        }

        //test: arb/hollow/stem1_ia.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.PassiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isHollow = root?.radicals[1] === Letter.Waw;

            if(isHollow && (verb.form.stem === 1) && (ExtractParameters(verb) === "ia"))
            {
                console.log("FOUND10", word);
            }
        }

        //test: arb/hollow/stem7.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isHollow = root?.radicals[1] === Letter.Waw;

            if(isHollow && (verb.form.stem === 7))
            {
                console.log("FOUND10", word);
            }
        }

        //test: arb/quadriliteral/stem4.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.PassiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isQuad = root?.radicals.length === 4;

            if(isQuad && (verb.form.stem === 4))
            {
                console.log("FOUND10", word);
            }
        }

        //test: arb/r2doubled/stem1_type_ia.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 1) && (root.radicals[1] === root.radicals[2]) && (ExtractParameters(verb) === "ia") && (root.radicals[0] !== "و"))
            {
                console.log("FOUND111", word);
            }
        }

        //test: arb/r2doubled/stem3.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isr2d = root.radicals[1] === root.radicals[2];

            if((verb.form.stem === 3) && isr2d)
            {
                console.log("FOUND12", word);
            }
        }

        //test: arb/r2doubled/stem6.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isr2d = root.radicals[1] === root.radicals[2];

            if((verb.form.stem === 6) && isr2d)
            {
                console.log("FOUND13", word);
            }
        }

        //test: arb/r2doubled/stem7.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isr2d = root.radicals[1] === root.radicals[2];

            if((verb.form.stem === 7) && isr2d)
            {
                console.log("FOUND14", word);
            }
        }

        //test: arb/sound/stem1_ii.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isSound = !(root.radicals.includes("و")) && !(root.radicals.includes("ي"));

            if((verb.form.stem === 1) && (ExtractParameters(verb) === "ii") && isSound)
            {
                console.log("FOUND15", word);
            }
        }

        //test: arb/sound/stem7_no_passive.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isSound = !(root.radicals.includes("و")) && !(root.radicals.includes("ي"));

            if((verb.form.stem === 7) && isSound)
            {
                console.log("FOUND16", word);
            }
        }

        //test: arb/sound/stem9.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isSound = !(root.radicals.includes("و")) && !(root.radicals.includes("ي"));

            if((verb.form.stem === 9) && isSound)
            {
                console.log("FOUND17", word);
            }
        }

        //test: arb/sound_but_weak_root/r1waw_stem1_ia.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const startsWithWaw = root.radicals.startsWith("و");

            if((verb.form.stem === 1) && startsWithWaw && (ExtractParameters(verb) === "ia") && ((verb.form.verbType ?? verb.form.variants![0].verbType) === OpenArabDictVerbType.Sound))
            {
                console.log("FOUND171", word);
            }
        }

        //test: arb/sound_but_weak_root/r1waw_stem2.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const startsWithWaw = root.radicals.startsWith("و");

            if((verb.form.stem === 2) && startsWithWaw)
            {
                console.log("FOUND172", word);
            }
        }

        //test: arb/specially_irregular/hamza_r1_irregular_imperative.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 1) && (root.radicals === "ءخذ"))
            {
                console.log("FOUND18", word);
            }
        }

        //test: arb/specially_irregular/hamza_r1_irregular_imperative.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 1) && (root.radicals === "ءخذ"))
            {
                console.log("FOUND19", word);
            }
        }

        //test: arb/specially_irregular/special_h-y-w_stem4.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 4) && (root.radicals === "حيو"))
            {
                console.log("FOUND30", word);
            }
        }

        //test: arb/specially_irregular/special_r-a-y.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 4) && (root.radicals === "رءي"))
            {
                console.log("FOUND20", word);
            }
        }
    }
}
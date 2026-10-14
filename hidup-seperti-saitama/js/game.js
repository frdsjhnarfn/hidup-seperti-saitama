/* ============================================================
   Core Game Logic - v2 (Update 12-10-2026 + Cooldown Fix)
   Includes: Skill Cooldown (round-based), Second Job,
   New Weapons, New Monsters, Buffs/Debuffs, Updated EXP Table
   ============================================================ */

import { DB } from './database.js';
import { Auth } from './auth.js';

const TIERS = ['White', 'Green', 'Blue', 'Purple', 'Red', 'Gold'];
const TIER_MULT = { White: 1, Green: 1.5, Blue: 2.25, Purple: 3.375, Red: 5.0625, Gold: 7.59375 };
const ENHANCE_COST = { White: 100, Green: 250, Blue: 500, Purple: 1000, Red: 2500 };
const DISMANTLE_YIELD = { White: 2, Green: 4, Blue: 8, Purple: 12, Red: 16 };

/* ---------- EXP TABLE (Updated 12-10-2026) ---------- */
const EXP_TABLE = {
    1: 100, 2: 225, 3: 375, 4: 525, 5: 675, 6: 825, 7: 1075, 8: 1350, 9: 1675,
    10: 2000, 11: 2500, 12: 3125, 13: 3750, 14: 4450, 15: 5000, 16: 6325,
    17: 7850, 18: 9200, 19: 10750, 20: 12500, 21: 14625, 22: 17500, 23: 20000, 24: 22500,
    25: 23250, 26: 25950, 27: 29725, 28: 32000, 29: 35000
};

/* ---------- WEAPON TYPES ---------- */
const WEAPON_TYPES = {
    Knife:     { stat: 'melee', base: 3,  allowedJobs: ['Novice', 'Warrior', 'Archer', 'Mage', 'Blade Master', 'Swordsman', 'Marksman', 'Bow Master', 'Wizard', 'Sage'], special: null },
    Sword:     { stat: 'melee', base: 6,  allowedJobs: ['Warrior', 'Blade Master', 'Swordsman'], special: null },
    Bow:       { stat: 'range', base: 8,  allowedJobs: ['Archer'], special: null },
    Staff:     { stat: 'magic', base: 10, allowedJobs: ['Mage', 'Sage'], special: null },
    Sabre:     { stat: 'melee', base: 7,  allowedJobs: ['Blade Master'], special: null },
    LongBow:   { stat: 'range', base: 12, allowedJobs: ['Marksman'], special: { atkSpdPct: -0.05 } },
    ShortBow:  { stat: 'range', base: 10, allowedJobs: ['Bow Master'], special: { atkSpdPct: 0.30 } },
    Grimoire:  { stat: 'magic', base: 10, allowedJobs: ['Wizard'], special: null }
};

/* ---------- JOB BONUS ---------- */
const JOB_BONUS = {
    Warrior: { str: 5, agi: 1, int: 1, hp: 10, mp: 0 },
    Archer:  { str: 2, agi: 5, int: 0, hp: 5,  mp: 0 },
    Mage:    { str: 1, agi: 1, int: 5, hp: 0,  mp: 10 },
    'Blade Master': { str: 5, agi: 1, int: 1, hp: 10, mp: 0 },
    Swordsman:      { str: 5, agi: 1, int: 1, hp: 10, mp: 0 },
    Marksman:       { str: 2, agi: 5, int: 0, hp: 5,  mp: 0 },
    'Bow Master':   { str: 2, agi: 5, int: 0, hp: 5,  mp: 0 },
    Wizard:         { str: 1, agi: 1, int: 5, hp: 0,  mp: 10 },
    Sage:           { str: 1, agi: 1, int: 5, hp: 0,  mp: 10 }
};

/* ---------- JOB TREE ---------- */
const JOB_TREE = {
    Warrior: ['Blade Master', 'Swordsman'],
    Archer:  ['Marksman', 'Bow Master'],
    Mage:    ['Wizard', 'Sage']
};

/* ---------- ATTRIBUTE SCALING ---------- */
const ATTR_SCALING = {
    Novice:  { hpPerStr: 2, mpPerInt: 3, meleePctPerStr: 0.10, rangePctPerAgi: 0.15, magicPctPerInt: 0.15, atkSpdPctPerAgi: 0.20 },
    Warrior:        { hpPerStr: 3, mpPerInt: 2, meleePctPerStr: 0.15, rangePctPerAgi: 0, magicPctPerInt: 0, atkSpdPctPerAgi: 0.10 },
    'Blade Master': { hpPerStr: 3, mpPerInt: 2, meleePctPerStr: 0.15, rangePctPerAgi: 0, magicPctPerInt: 0, atkSpdPctPerAgi: 0.10 },
    Swordsman:      { hpPerStr: 3, mpPerInt: 2, meleePctPerStr: 0.15, rangePctPerAgi: 0, magicPctPerInt: 0, atkSpdPctPerAgi: 0.10 },
    Archer:        { hpPerStr: 2, mpPerInt: 2, meleePctPerStr: 0, rangePctPerAgi: 0.15, magicPctPerInt: 0, atkSpdPctPerAgi: 0.20 },
    Marksman:      { hpPerStr: 2, mpPerInt: 2, meleePctPerStr: 0, rangePctPerAgi: 0.15, magicPctPerInt: 0, atkSpdPctPerAgi: 0.20 },
    'Bow Master':  { hpPerStr: 2, mpPerInt: 2, meleePctPerStr: 0, rangePctPerAgi: 0.15, magicPctPerInt: 0, atkSpdPctPerAgi: 0.20 },
    Mage:   { hpPerStr: 2, mpPerInt: 3, meleePctPerStr: 0, rangePctPerAgi: 0, magicPctPerInt: 0.15, atkSpdPctPerAgi: 0.15 },
    Sage:   { hpPerStr: 2, mpPerInt: 3, meleePctPerStr: 0, rangePctPerAgi: 0, magicPctPerInt: 0.15, atkSpdPctPerAgi: 0.15 },
    Wizard: { hpPerStr: 2, mpPerInt: 3, meleePctPerStr: 0, rangePctPerAgi: 0, magicPctPerInt: 0.15, atkSpdPctPerAgi: 0.15 }
};

/* ---------- SKILLS ---------- */
const SKILLS = {
    Slash: { name: 'Slash', mp: 3, mult: 0.35, dmgType: 'melee', source: 'base', minLevel: 1, class: 'Novice', cooldown: 2 },
    // Warrior
    SwordDance:  { name: 'Sword Dance',  mp: 5,  mult: 0.60, dmgType: 'melee', source: 'class', minLevel: 12, class: 'Warrior', cooldown: 2 },
    FlyingSword: { name: 'Flying Sword', mp: 12, mult: 1.50, dmgType: 'melee', source: 'class', minLevel: 18, class: 'Warrior', recoil: 0.10, cooldown: 3 },
    // Archer
    PiercingShot: { name: 'Piercing Shot', mp: 5,  mult: 0.75, dmgType: 'range', source: 'class', minLevel: 12, class: 'Archer', cooldown: 2 },
    ArrowShower:  { name: 'Arrow Shower',  mp: 10, mult: 1.25, dmgType: 'range', source: 'class', minLevel: 18, class: 'Archer', cooldown: 3 },
    // Mage
    Fireball:       { name: 'Fireball',        mp: 5,  mult: 0.50, dmgType: 'magic', source: 'class', minLevel: 12, class: 'Mage', cooldown: 2 },
    LightningShock: { name: 'Lightning Shock', mp: 8,  mult: 0.75, dmgType: 'magic', source: 'class', minLevel: 15, class: 'Mage', cooldown: 3 },
    FreezingField:  { name: 'Freezing Field',  mp: 12, mult: 1.20, dmgType: 'magic', source: 'class', minLevel: 18, class: 'Mage', slow: 0.30, cooldown: 5 },
    // Blade Master
    BladeFury:  { name: 'Blade Fury',  mp: 15, mult: 1.00, dmgType: 'melee', source: 'class', minLevel: 22, class: 'Blade Master', lifesteal: 0.03, cooldown: 3 },
    DoubleEdge: { name: 'Double Edge', mp: 20, mult: 1.50, dmgType: 'melee', source: 'class', minLevel: 25, class: 'Blade Master', alwaysHit: true, bleed: 0.05, bleedTurns: 2, cooldown: 5 },
    // Swordsman
    RapidSlash:    { name: 'Rapid Slash',    mp: 15, mult: 1.00, dmgType: 'melee', source: 'class', minLevel: 22, class: 'Swordsman', atkSpdBuff: 0.50, atkSpdBuffTurns: 3, cooldown: 5 },
    HeavenlySword: { name: 'Heavenly Sword', mp: 30, mult: 2.00, dmgType: 'melee', source: 'class', minLevel: 25, class: 'Swordsman', unkillable: 3, cooldown: 10 },
    // Marksman
    FocusShot: { name: 'Focus Shot', mp: 10, mult: 1.50, dmgType: 'range', source: 'class', minLevel: 22, class: 'Marksman', enemyAtkSpdDebuff: -0.10, cooldown: 2 },
    Headshot:  { name: 'Headshot',   mp: 15, mult: 2.00, dmgType: 'range', source: 'class', minLevel: 25, class: 'Marksman', enemyAtkSpdDebuff: -0.10, cooldown: 3 },
    // Bow Master
    FocusFire: { name: 'Focus Fire', mp: 10, mult: 0,    dmgType: 'range', source: 'class', minLevel: 22, class: 'Bow Master', selfAtkDmgBuff: 0.50, selfAtkSpdBuff: 0.50, buffTurns: 4, cooldown: 7 },
    Buckshot:  { name: 'Buckshot',   mp: 15, mult: 1.00, dmgType: 'range', source: 'class', minLevel: 25, class: 'Bow Master', bleed: 0.05, bleedTurns: 2, cooldown: 4 },
    // Wizard
    Flamethrower: { name: 'Flamethrower', mp: 7,  mult: 1.00, dmgType: 'magic', source: 'class', minLevel: 20, class: 'Wizard', cooldown: 3 },
    IceAge:       { name: 'Ice Age',      mp: 15, mult: 1.50, dmgType: 'magic', source: 'class', minLevel: 22, class: 'Wizard', cooldown: 3 },
    Earthquake:   { name: 'Earthquake',   mp: 25, mult: 2.50, dmgType: 'magic', source: 'class', minLevel: 25, class: 'Wizard', cooldown: 3 },
    // Sage
    HealingWard:        { name: 'Healing Ward',        mp: 20, mult: 0,    dmgType: 'magic', source: 'class', minLevel: 20, class: 'Sage', healPct: 0.50, healTurns: 3, cooldown: 5 },
    PurgatoryFlameBurst:{ name: 'Purgatory Flame Burst',mp: 20, mult: 1.50, dmgType: 'magic', source: 'class', minLevel: 22, class: 'Sage', cooldown: 3 },
    HeavensCall:        { name: "Heaven's Call",        mp: 50, mult: 0,    dmgType: 'magic', source: 'class', minLevel: 25, class: 'Sage', revive: 0.50, refreshCooldowns: true, cooldown: 15 }
};

/* ---------- MONSTERS ---------- */
const MONSTERS = {
    Chicken: {
        hp: 15, mp: 0, atkMin: 1, atkMax: 3, atkSpd: 8, exp: 8, hitRate: 0.80, skills: [],
        drop: { White: 99, Green: 1 },
        dropItems: ['Knife']
    },
    Sheep: {
        hp: 30, mp: 0, atkMin: 2, atkMax: 5, atkSpd: 11, exp: 13, hitRate: 0.80, skills: [],
        drop: { White: 98, Green: 2 },
        dropItems: ['Knife', 'Bow', 'Staff', 'Sword']
    },
    Cow: {
        hp: 60, mp: 0, atkMin: 4, atkMax: 8, atkSpd: 13, exp: 17, hitRate: 0.80, skills: [],
        drop: { White: 95, Green: 4, Blue: 1 },
        dropItems: ['Knife', 'Bow', 'Staff', 'Sword']
    },
    Dog: {
        hp: 100, mp: 10, atkMin: 7, atkMax: 10, atkSpd: 15, exp: 23, hitRate: 0.80,
        skills: [{ name: 'Bark', mp: 3, mult: 1.20, alwaysHit: true }],
        drop: { White: 90, Green: 7, Blue: 2.5, Purple: 0.5 },
        dropItems: ['Bow', 'Staff', 'Sword', 'Sabre', 'Grimoire', 'LongBow', 'ShortBow']
    },
    Lion: {
        hp: 150, mp: 25, atkMin: 10, atkMax: 15, atkSpd: 18, exp: 32, hitRate: 0.80,
        skills: [
            { name: 'Growling', mp: 4, mult: 0, stun: true },
            { name: 'Scratch', mp: 5, mult: 1.35, alwaysHit: true }
        ],
        drop: { White: 85, Green: 10, Blue: 3, Purple: 1.5, Red: 0.49, Gold: 0.01 },
        dropItems: ['Sword', 'Staff', 'Sabre', 'Grimoire', 'LongBow', 'ShortBow']
    },
    Elephant: {
        hp: 250, mp: 40, atkMin: 18, atkMax: 25, atkSpd: 21, exp: 45, hitRate: 0.85,
        skills: [
            { name: 'Elephant Charge', mp: 5, mult: 1.40, stun: true },
            { name: 'Horn Attack', mp: 8, mult: 1.75, alwaysHit: true },
            { name: 'Elephant Stampede', mp: 15, mult: 2.00, selfAtkDmgBuff: 0.20, buffTurns: 3, cooldown: 5 }
        ],
        drop: { White: 75, Green: 17, Blue: 5, Purple: 2.5, Red: 1, Gold: 0.5 },
        dropItems: ['Sword', 'Staff', 'Sabre', 'Grimoire', 'LongBow', 'ShortBow']
    },
    Dragon: {
        hp: 9999, mp: 9999, atkMin: 100, atkMax: 150, atkSpd: 99, exp: 4999, hitRate: 0.85,
        skills: [
            { name: 'Dragon Breath', mp: 25, mult: 1.75, burn: 0.03, burnTurns: 4, cooldown: 3 },
            { name: 'Dragon Meteor', mp: 100, mult: 2.50, alwaysHit: true, cooldown: 5 },
            { name: 'Thunder God', mp: 150, mult: 3.25, paralyze: true, cooldown: 7 }
        ],
        drop: { Blue: 70, Purple: 15, Red: 10, Gold: 5 },
        dropItems: ['Sword', 'Staff', 'Sabre', 'Grimoire', 'LongBow', 'ShortBow']
    }
};

const Game = {
    hero: null,
    inventory: [],
    iron: 0,
    equippedItem: null,
    inventorySlots: 10,
    battle: null,
    username: null,
    isGuest: false,
    pendingJobChoice: false,

    getScaling() {
        if (!this.hero || !this.hero.job) return ATTR_SCALING.Novice;
        return ATTR_SCALING[this.hero.job] || ATTR_SCALING.Novice;
    },

        /* ---------- Hero Sprite ---------- */
    getHeroSprite() {
        if (!this.hero) return 'assets/novice_male.png';

        const gender = this.hero.gender || 'male';
        const job = this.hero.job || 'novice';

        // Normalize job name → lowercase, no space
        let jobKey = 'novice';
        if (job === 'Warrior') jobKey = 'warrior';
        else if (job === 'Archer') jobKey = 'archer';
        else if (job === 'Mage') jobKey = 'mage';
        // Second job: fall back ke first job sprite
        else if (['Blade Master', 'Swordsman'].includes(job)) jobKey = 'warrior';
        else if (['Marksman', 'Bow Master'].includes(job)) jobKey = 'archer';
        else if (['Wizard', 'Sage'].includes(job)) jobKey = 'mage';

        return `assets/${jobKey}_${gender}.png`;
    },

    async createHero(name, username, isGuest, gender = 'male') {
        this.username = username;
        this.isGuest = isGuest;
        this.hero = {
            name: name,
            gender: gender,
            level: 1,
            exp: 0,
            hp: 10, maxHp: 10,
            mp: 10, maxMp: 10,
            str: 0, agi: 0, int: 0,
            baseAtk: 3,
            baseSpd: 10,
            class: 'Novice',
            job: null,
            statPoints: 0,
            bonusHp: 0,
            bonusMp: 0,
            atkSpdBuff: 0, atkSpdBuffTurns: 0,
            atkDmgBuff: 0, atkDmgBuffTurns: 0,
            unkillableTurns: 0,
            healPct: 0, healTurns: 0,
            cooldowns: {}
        };
        this.inventory = [];
        this.iron = 0;
        this.equippedItem = null;

        const knife = this.generateItem('White', 'Knife');
        this.equippedItem = knife;

        await this.save();
        this.render();
    },

    generateItem(tier, typeOverride, customBase) {
        const allTypes = ['Knife', 'Sword', 'Bow', 'Staff', 'Sabre', 'LongBow', 'ShortBow', 'Grimoire'];
        const type = typeOverride || allTypes[Math.floor(Math.random() * allTypes.length)];
        const def = WEAPON_TYPES[type];
        const base = customBase !== undefined ? customBase : def.base;
        let value;
        if (customBase !== undefined) {
            value = Math.round(base * (TIER_MULT[tier] / TIER_MULT.White));
        } else {
            value = Math.round(base * TIER_MULT[tier]);
        }
        return {
            id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
            name: `${tier} ${type}`,
            tier: tier,
            type: type,
            stat: def.stat,
            value: value,
            allowedJobs: def.allowedJobs,
            special: def.special
        };
    },

        /* ---------- Fix item stat (migration for old data) ---------- */
    fixItemStat(item) {
        if (!item || !item.type) return item;
        const def = WEAPON_TYPES[item.type];
        if (!def) return item;

        // Correct stat based on current WEAPON_TYPES
        const correctStat = def.stat;
        if (item.stat !== correctStat) {
            console.log(`[MIGRATION] Fixing item ${item.name}: stat ${item.stat} → ${correctStat}`);
            item.stat = correctStat;
        }

        // Also update allowedJobs to reflect current restrictions
        if (def.allowedJobs && (!item.allowedJobs || JSON.stringify(item.allowedJobs) !== JSON.stringify(def.allowedJobs))) {
            item.allowedJobs = def.allowedJobs;
        }

        return item;
    },

    getTotalAttack() {
        const s = this.getScaling();
        let melee = this.hero.baseAtk;
        let range = this.hero.baseAtk;
        let magic = this.hero.baseAtk;

        melee += melee * (this.hero.str * s.meleePctPerStr);
        range += range * (this.hero.agi * s.rangePctPerAgi);
        magic += magic * (this.hero.int * s.magicPctPerInt);

        let dmgBuff = 1 + (this.hero.atkDmgBuff || 0);

        if (this.equippedItem) {
            if (this.equippedItem.stat === 'melee') {
                melee += this.equippedItem.value;
            } else if (this.equippedItem.stat === 'range') {
                range += this.equippedItem.value;
            } else if (this.equippedItem.stat === 'magic') {
                magic += this.equippedItem.value;
            }
        }
        return {
            melee: Math.round(melee * dmgBuff),
            range: Math.round(range * dmgBuff),
            magic: Math.round(magic * dmgBuff)
        };
    },

    getAttackSpeed() {
        const s = this.getScaling();
        let spd = this.hero.baseSpd;
        spd += spd * (this.hero.agi * s.atkSpdPctPerAgi);

        if (this.equippedItem && this.equippedItem.special && this.equippedItem.special.atkSpdPct) {
            spd += spd * this.equippedItem.special.atkSpdPct;
        }

        spd += spd * (this.hero.atkSpdBuff || 0);

        return Math.max(1, Math.round(spd));
    },

    getMaxHp() {
        const s = this.getScaling();
        return 10 + (this.hero.bonusHp || 0) + (this.hero.str * s.hpPerStr);
    },
    getMaxMp() {
        const s = this.getScaling();
        return 10 + (this.hero.bonusMp || 0) + (this.hero.int * s.mpPerInt);
    },

    getAvailableSkills() {
        const list = [];
        for (const [id, skill] of Object.entries(SKILLS)) {
            if (skill.source === 'base') {
                list.push({ id, ...skill });
            } else if (skill.class === this.hero.job && this.hero.level >= skill.minLevel) {
                list.push({ id, ...skill });
            }
        }
        return list;
    },

    /* ---------- Cooldown helper (round-based) ---------- */
    getCooldownLeft(skillId, currentRound) {
        const cdData = this.hero.cooldowns?.[skillId];
        if (!cdData) return 0;

        // Support old format (number) → convert
        if (typeof cdData === 'number') {
            return cdData;
        }

        const cdMax = cdData.cooldown || 0;
        const usedAt = cdData.usedAtRound || 0;
        return Math.max(0, cdMax - (currentRound - usedAt));
    },

    canEquip(item) {
        if (!item) return false;
        const def = WEAPON_TYPES[item.type];
        if (!def) return false;
        return def.allowedJobs.includes(this.hero.job) ||
               (item.type === 'Knife');
    },

    gainExp(amount) {
        this.hero.exp += amount;
        let leveled = false;
        let reachedJobChoice = false;

        while (this.hero.level < 25 && this.hero.exp >= EXP_TABLE[this.hero.level]) {
            this.hero.exp -= EXP_TABLE[this.hero.level];
            this.hero.level++;
            leveled = true;
            this.hero.statPoints += 3;

            if (this.hero.level === 11 && !this.hero.job) {
                reachedJobChoice = true;
            }
            if (this.hero.level === 21 && this.hero.job && Object.keys(JOB_TREE).includes(this.hero.job)) {
                reachedJobChoice = true;
            }

            if (this.hero.level >= 1 && this.hero.level < 10) this.hero.class = 'Novice';
            else if (this.hero.job) this.hero.class = this.hero.job;
            else if (this.hero.level >= 10) this.hero.class = 'Novice (Awaiting Job)';

            this.hero.maxHp = this.getMaxHp();
            this.hero.maxMp = this.getMaxMp();
            this.hero.hp = this.hero.maxHp;
            this.hero.mp = this.hero.maxMp;
        }

        return { leveled, reachedJobChoice };
    },

    async chooseJob(jobName) {
        if (!JOB_BONUS[jobName]) return;

        const bonus = JOB_BONUS[jobName];
        this.hero.job = jobName;
        this.hero.class = jobName;
        this.hero.str += bonus.str;
        this.hero.agi += bonus.agi;
        this.hero.int += bonus.int;
        this.hero.bonusHp = (this.hero.bonusHp || 0) + bonus.hp;
        this.hero.bonusMp = (this.hero.bonusMp || 0) + bonus.mp;

        this.hero.maxHp = this.getMaxHp();
        this.hero.maxMp = this.getMaxMp();
        this.hero.hp = this.hero.maxHp;
        this.hero.mp = this.hero.maxMp;

        this.pendingJobChoice = false;
        await this.save();
        this.render();
    },

    async save() {
        if (!this.username) return;
        const dataToSave = {
            hero: this.hero,
            inventory: this.inventory,
            iron: this.iron,
            equippedItem: this.equippedItem,
            savedAt: Date.now()
        };
        try {
            await DB.saveGame(this.username, dataToSave);
        } catch (error) {
            console.error('Save failed:', error);
        }
    },

    async load(data) {
        this.username = Auth.currentUser;
        this.isGuest = Auth.isGuest;

        this.hero = data.hero;
        this.inventory = data.inventory || [];
        this.iron = data.iron || 0;
        this.equippedItem = data.equippedItem || null;

        this.inventory = this.inventory.map(item => this.fixItemStat(item));
        if (this.equippedItem) this.equippedItem = this.fixItemStat(this.equippedItem);

        if (this.hero.statPoints === undefined) this.hero.statPoints = (this.hero.level - 1) * 3;
        if (this.hero.bonusHp === undefined) this.hero.bonusHp = 0;
        if (this.hero.bonusMp === undefined) this.hero.bonusMp = 0;
        if (this.hero.job === undefined) this.hero.job = null;
        if (this.hero.atkSpdBuff === undefined) this.hero.atkSpdBuff = 0;
        if (this.hero.atkSpdBuffTurns === undefined) this.hero.atkSpdBuffTurns = 0;
        if (this.hero.atkDmgBuff === undefined) this.hero.atkDmgBuff = 0;
        if (this.hero.atkDmgBuffTurns === undefined) this.hero.atkDmgBuffTurns = 0;
        if (this.hero.unkillableTurns === undefined) this.hero.unkillableTurns = 0;
        if (this.hero.healPct === undefined) this.hero.healPct = 0;
        if (this.hero.healTurns === undefined) this.hero.healTurns = 0;
        if (this.hero.cooldowns === undefined) this.hero.cooldowns = {};

        // Migrate old cooldown format (number → object)
        for (const key of Object.keys(this.hero.cooldowns)) {
            if (typeof this.hero.cooldowns[key] === 'number') {
                // Old format: just clear it, hero can use skill again
                delete this.hero.cooldowns[key];
            }
        }

        this.render();
    },

    reset() {
        this.hero = null;
        this.inventory = [];
        this.iron = 0;
        this.equippedItem = null;
        this.battle = null;
        this.username = null;
        this.isGuest = false;
    },

    render() {
        if (!this.hero) return;

        // Sidebar
        document.getElementById('sidebar-hero-name').textContent = this.hero.name;
        document.getElementById('sidebar-hero-class').textContent = this.hero.class;
        // Character card
        const sprite = this.getHeroSprite();
        document.getElementById('char-sprite').src = sprite;
        document.getElementById('char-name').textContent = this.hero.name;
        document.getElementById('char-class').textContent = this.hero.class;
        document.getElementById('char-gender').textContent = (this.hero.gender || 'male').toUpperCase();
        document.getElementById('stat-class').textContent = this.hero.class;
        document.getElementById('stat-level').textContent = this.hero.level;
        const expNeeded = EXP_TABLE[this.hero.level] || 'MAX';
        document.getElementById('stat-exp').textContent = `${this.hero.exp} / ${expNeeded}`;
        document.getElementById('stat-hp').textContent = `${this.hero.hp} / ${this.getMaxHp()}`;
        document.getElementById('stat-mp').textContent = `${this.hero.mp} / ${this.getMaxMp()}`;
        document.getElementById('stat-str').textContent = this.hero.str;
        document.getElementById('stat-agi').textContent = this.hero.agi;
        document.getElementById('stat-int').textContent = this.hero.int;

        const points = this.hero.statPoints || 0;
        document.getElementById('stat-points').textContent = points;
        document.querySelectorAll('.stat-plus-btn').forEach(btn => {
            btn.disabled = points <= 0;
        });

        const atk = this.getTotalAttack();
        let displayAtk = atk.melee;
        if (this.equippedItem) {
            if (this.equippedItem.stat === 'range') displayAtk = atk.range;
            else if (this.equippedItem.stat === 'magic') displayAtk = atk.magic;
        }
        document.getElementById('stat-atk').textContent = displayAtk;
        document.getElementById('stat-spd').textContent = this.getAttackSpeed();

        const eqEl = document.getElementById('equipped-item');
        if (this.equippedItem) {
            const statLabel = this.equippedItem.stat === 'melee' ? 'Melee' : this.equippedItem.stat === 'range' ? 'Range' : 'Magic';
            eqEl.innerHTML = `<p class="tier-${this.equippedItem.tier.toLowerCase()}">${this.equippedItem.name}</p>
                              <p>+${this.equippedItem.value} ${statLabel} Damage</p>`;
            document.getElementById('unequip-btn').disabled = false;
        } else {
            eqEl.innerHTML = `<p class="empty-slot">No equipment</p>`;
            document.getElementById('unequip-btn').disabled = true;
        }

        document.getElementById('iron-count').textContent = this.iron;
        this.renderSkills();
    },

    renderSkills() {
        const el = document.getElementById('skills-list');
        if (!el) return;
        const skills = this.getAvailableSkills();
        if (skills.length === 0) {
            el.innerHTML = '<p class="empty-slot">No skills yet</p>';
            return;
        }
        el.innerHTML = skills.map(s => {
            return `
            <div class="skill-info">
                <span class="skill-name">${s.name}</span>
                <span class="skill-mp">${s.mp} MP</span>
                <span class="skill-desc">+${Math.round(s.mult * 100)}% ${s.dmgType} damage${s.recoil ? ' (recoil ' + (s.recoil * 100) + '% HP)' : ''}${s.slow ? ' (slow ' + (s.slow * 100) + '%)' : ''}${s.cooldown ? ' • CD ' + s.cooldown + ' turns' : ''}</span>
            </div>`;
        }).join('');
    },

    renderEnemies() {
        const list = document.getElementById('enemy-list');
        list.innerHTML = '';
        for (const [name, data] of Object.entries(MONSTERS)) {
            const card = document.createElement('div');
            card.className = 'enemy-card';
            card.innerHTML = `
                <h4>${name}</h4>
                <p class="enemy-stat">HP: ${data.hp}</p>
                <p class="enemy-stat">Attack: ${data.atkMin}-${data.atkMax}</p>
                <p class="enemy-stat">Speed: ${data.atkSpd}</p>
                <p class="enemy-stat">EXP: ${data.exp}</p>
            `;
            card.addEventListener('click', () => this.startBattle(name));
            list.appendChild(card);
        }
    },

    renderInventory() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';
        for (let i = 0; i < this.inventorySlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            const item = this.inventory[i];
            if (item) {
                slot.classList.add('filled');
                slot.innerHTML = `<span class="item-name tier-${item.tier.toLowerCase()}">${item.name}</span>
                                  <span style="color:var(--text-dim);font-size:0.65rem;">+${item.value}</span>`;
                slot.addEventListener('click', () => this.selectItem(i));
            } else {
                slot.classList.add('empty');
                slot.textContent = '—';
            }
            grid.appendChild(slot);
        }
    },

    selectItem(index) {
        const item = this.inventory[index];
        if (!item) return;
        const panel = document.getElementById('item-action-panel');
        panel.classList.remove('hidden');
        document.getElementById('selected-item-name').textContent = item.name;
        document.getElementById('selected-item-name').className = 'tier-' + item.tier.toLowerCase();
        const statLabel = item.stat === 'melee' ? 'Melee' : item.stat === 'range' ? 'Range' : 'Magic';
        document.getElementById('selected-item-stats').textContent =
            `+${item.value} ${statLabel} Damage | Tier: ${item.tier}`;

        panel.dataset.index = index;

        const cost = ENHANCE_COST[item.tier];
        document.getElementById('enhance-cost').textContent = cost
            ? `Enhance cost: ${cost} Iron (you have ${this.iron})`
            : 'Max tier — cannot enhance further.';

        document.getElementById('item-enhance-btn').disabled = !cost || this.iron < cost;
        document.getElementById('item-dismantle-btn').disabled = item.tier === 'Gold';
    },

    closeItemPanel() {
        document.getElementById('item-action-panel').classList.add('hidden');
    },

    async equipItem(index) {
        const item = this.inventory[index];
        if (!item) return;

        this.fixItemStat(item);

        if (!this.canEquip(item)) {
            alert(`Cannot equip ${item.type}! Restricted to: ${item.allowedJobs.join(', ')}.`);
            return;
        }

        if (this.equippedItem) {
            this.inventory[index] = this.equippedItem;
        } else {
            this.inventory.splice(index, 1);
        }
        this.equippedItem = item;
        this.closeItemPanel();
        this.render();
        this.renderInventory();
        await this.save();
    },

    async unequipItem() {
        if (!this.equippedItem) return;
        if (this.inventory.length >= this.inventorySlots) {
            alert('Inventory is full!');
            return;
        }
        this.inventory.push(this.equippedItem);
        this.equippedItem = null;
        this.render();
        this.renderInventory();
        await this.save();
    },

    async allocateStat(stat) {
        if (!this.hero || this.hero.statPoints <= 0) return;
        const validStats = ['str', 'agi', 'int'];
        if (!validStats.includes(stat)) return;

        const scaling = this.getScaling();
        this.hero.statPoints--;
        this.hero[stat]++;

        if (stat === 'str') {
            this.hero.maxHp = this.getMaxHp();
            this.hero.hp += scaling.hpPerStr;
            if (this.hero.hp > this.hero.maxHp) this.hero.hp = this.hero.maxHp;
        } else if (stat === 'int') {
            this.hero.maxMp = this.getMaxMp();
            this.hero.mp += scaling.mpPerInt;
            if (this.hero.mp > this.hero.maxMp) this.hero.mp = this.hero.maxMp;
        }

        this.render();
        await this.save();
    },

    async enhanceItem(index) {
        const item = this.inventory[index];
        if (!item) return;
        const cost = ENHANCE_COST[item.tier];
        if (!cost) return alert('Item is already max tier.');
        if (this.iron < cost) return alert('Not enough Iron.');

        this.iron -= cost;
        const tierIdx = TIERS.indexOf(item.tier);
        const newTier = TIERS[tierIdx + 1];
        const def = WEAPON_TYPES[item.type];

        item.tier = newTier;
        item.name = `${newTier} ${item.type}`;
        item.value = Math.round(def.base * TIER_MULT[newTier]);

        this.closeItemPanel();
        this.render();
        this.renderInventory();
        await this.save();
        alert(`Enhanced to ${newTier}!`);
    },

    async dismantleItem(index) {
        const item = this.inventory[index];
        if (!item) return;
        if (item.tier === 'Gold') return alert('Gold items cannot be dismantled.');
        const yieldIron = DISMANTLE_YIELD[item.tier] || 0;
        this.iron += yieldIron;
        this.inventory.splice(index, 1);
        this.closeItemPanel();
        this.render();
        this.renderInventory();
        await this.save();
        alert(`Dismantled! +${yieldIron} Iron.`);
    },

    async discardItem(index) {
        if (!confirm('Discard this item permanently?')) return;
        this.inventory.splice(index, 1);
        this.closeItemPanel();
        this.renderInventory();
        await this.save();
    },

    /* ============================================================
       BATTLE
       ============================================================ */

    computeAttacksPerRound() {
        const b = this.battle;
        const heroSpd = this.getAttackSpeed();
        const enemySpd = b.monsterData.atkSpd;

        const faster = Math.max(heroSpd, enemySpd);
        const slower = Math.min(heroSpd, enemySpd);

        const ratio = faster / slower;
        const fasterAttacks = Math.max(1, Math.floor(ratio));

        if (heroSpd >= enemySpd) {
            return { heroAttacks: fasterAttacks, enemyAttacks: 1 };
        } else {
            return { heroAttacks: 1, enemyAttacks: fasterAttacks };
        }
    },

    startBattle(monsterName) {
        const data = MONSTERS[monsterName];
        if (!data) return;

        this.battle = {
            monster: monsterName,
            monsterData: data,
            monsterHp: data.hp,
            monsterMaxHp: data.hp,
            monsterMp: data.mp,
            heroStunned: false,
            heroParalyzed: false,
            monsterSlowed: 0,
            monsterBleed: 0, monsterBleedTurns: 0,
            monsterBurn: 0, monsterBurnTurns: 0,
            monsterAtkSpdDebuff: 0,
            over: false,
            round: 1,
            heroAttacksLeft: 0,
            enemyAttacksLeft: 0
        };

        this.hero.cooldowns = {};
        
        const counts = this.computeAttacksPerRound();
        this.battle.heroAttacksLeft = counts.heroAttacks;
        this.battle.enemyAttacksLeft = counts.enemyAttacks;

        document.getElementById('enemy-select').classList.add('hidden');
        document.getElementById('battle-screen').classList.remove('hidden');
        document.getElementById('battle-log').innerHTML = '';
        document.getElementById('battle-hero-name').textContent = this.hero.name;
        document.getElementById('battle-enemy-name').textContent = monsterName;
        this.log(`A wild ${monsterName} appears!`, 'info');
        this.log(`— Round ${this.battle.round} —`, 'info');
        this.log(`Attack Speed: You ${this.getAttackSpeed()} vs ${data.atkSpd}`, 'info');
        this.log(`You attack ${counts.heroAttacks}× per round, ${monsterName} attacks ${counts.enemyAttacks}×`, 'info');
        this.updateBattleUI();
        this.enableActions(true);
        document.getElementById('skill-panel').classList.add('hidden');
    },

    log(msg, cls) {
        const logEl = document.getElementById('battle-log');
        const p = document.createElement('p');
        p.className = 'log-' + (cls || 'info');
        p.textContent = msg;
        logEl.appendChild(p);
        logEl.scrollTop = logEl.scrollHeight;
    },

    updateBattleUI() {
        if (!this.battle) return;
        const b = this.battle;
        const heroMaxHp = this.getMaxHp();
        const heroMaxMp = this.getMaxMp();

        document.getElementById('battle-hero-hp-text').textContent = `${this.hero.hp} / ${heroMaxHp}`;
        document.getElementById('battle-hero-hp-bar').style.width = Math.max(0, this.hero.hp / heroMaxHp * 100) + '%';
        document.getElementById('battle-hero-mp-text').textContent = `${this.hero.mp} / ${heroMaxMp}`;
        document.getElementById('battle-hero-mp-bar').style.width = Math.max(0, this.hero.mp / heroMaxMp * 100) + '%';
        document.getElementById('battle-enemy-hp-text').textContent = `${b.monsterHp} / ${b.monsterMaxHp}`;
        document.getElementById('battle-enemy-hp-bar').style.width = Math.max(0, b.monsterHp / b.monsterMaxHp * 100) + '%';

        const heroStatus = document.getElementById('battle-hero-status');
        const enemyStatus = document.getElementById('battle-enemy-status');
        let hStatus = [];
        if (b.heroStunned) hStatus.push('STUNNED');
        if (b.heroParalyzed) hStatus.push('PARALYZED');
        if (this.hero.unkillableTurns > 0) hStatus.push('UNKILLABLE(' + this.hero.unkillableTurns + ')');
        if (this.hero.healTurns > 0) hStatus.push('HEAL(' + this.hero.healTurns + ')');
        if (this.hero.atkDmgBuffTurns > 0) hStatus.push('ATK+');
        if (heroStatus) heroStatus.textContent = hStatus.join(' | ');

        let eStatus = [];
        if (b.monsterSlowed > 0) eStatus.push('SLOWED');
        if (b.monsterBleedTurns > 0) eStatus.push('BLEED(' + b.monsterBleedTurns + ')');
        if (b.monsterBurnTurns > 0) eStatus.push('BURN(' + b.monsterBurnTurns + ')');
        if (enemyStatus) enemyStatus.textContent = eStatus.join(' | ');
    },

    enableActions(enabled) {
        const ids = ['action-attack', 'action-skill', 'action-leave'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enabled;
        });
    },

    proceedAfterHeroAction() {
        const b = this.battle;
        if (!b || b.over) return;
        if (b.monsterHp <= 0) { b.monsterHp = 0; this.updateBattleUI(); this.endBattle(true); return; }

        b.heroAttacksLeft--;
        if (b.heroAttacksLeft > 0) {
            this.log(`⚡ Extra attack! (${b.heroAttacksLeft} left this round)`, 'hero');
            this.enableActions(true);
            return;
        }
        b.enemyAttacksLeft = b.enemyAttacksLeft > 0 ? b.enemyAttacksLeft : this.computeAttacksPerRound().enemyAttacks;
        setTimeout(() => this.enemyTurnLoop(), 500);
    },

    enemyTurnLoop() {
        const b = this.battle;
        if (!b || b.over) return;

        // Bleed/Burn tick at start of enemy turn
        if (b.monsterBleedTurns > 0) {
            const bleedDmg = Math.round(this.getTotalAttack().melee * b.monsterBleed);
            b.monsterHp -= bleedDmg;
            b.monsterBleedTurns--;
            this.log(`${b.monster} takes ${bleedDmg} bleed damage! (${b.monsterBleedTurns} turns left)`, 'hero');
        }
        if (b.monsterBurnTurns > 0) {
            const burnDmg = Math.round(b.monsterMaxHp * b.monsterBurn);
            b.monsterHp -= burnDmg;
            b.monsterBurnTurns--;
            this.log(`${b.monster} takes ${burnDmg} burn damage! (${b.monsterBurnTurns} turns left)`, 'hero');
        }
        this.updateBattleUI();
        if (b.monsterHp <= 0) { b.monsterHp = 0; this.endBattle(true); return; }

        if (b.heroStunned || b.heroParalyzed) {
            this.log(`${this.hero.name} is ${b.heroStunned ? 'stunned' : 'paralyzed'} and cannot act!`, 'info');
            b.heroStunned = false;
            b.heroParalyzed = false;
            this.updateBattleUI();
            this.endRound();
            return;
        }

        if (b.enemyAttacksLeft <= 0) { this.endRound(); return; }

        if (b.monsterSlowed > 0) {
            b.monsterSlowed--;
            if (Math.random() < 0.30) {
                this.log(`${b.monster} is slowed and skips its attack!`, 'info');
                this.updateBattleUI();
                b.enemyAttacksLeft--;
                if (b.enemyAttacksLeft > 0) setTimeout(() => this.enemyTurnLoop(), 500);
                else this.endRound();
                return;
            }
        }

        this.enemySingleAttack();
        if (b.over) return;

        b.enemyAttacksLeft--;
        if (b.enemyAttacksLeft > 0) setTimeout(() => this.enemyTurnLoop(), 600);
        else this.endRound();
    },

    enemySingleAttack() {
        const b = this.battle;
        const data = b.monsterData;

        let useSkill = null;
        if (data.skills.length > 0 && Math.random() < 0.30) {
            const affordable = data.skills.filter(s => b.monsterMp >= s.mp);
            if (affordable.length > 0) useSkill = affordable[Math.floor(Math.random() * affordable.length)];
        }

        const baseDmg = Math.floor(Math.random() * (data.atkMax - data.atkMin + 1)) + data.atkMin;
        let dmg;

        if (useSkill) {
            b.monsterMp -= useSkill.mp;
            this.log(`${b.monster} uses ${useSkill.name}!`, 'enemy');

            if (useSkill.stun) {
                if (useSkill.alwaysHit || Math.random() < data.hitRate) {
                    b.heroStunned = true;
                    this.log(`${this.hero.name} is stunned!`, 'enemy');
                    this.updateBattleUI();
                    return;
                } else {
                    this.log(`... but it MISSES!`, 'enemy');
                    return;
                }
            }

            if (useSkill.paralyze) {
                if (useSkill.alwaysHit || Math.random() < data.hitRate) {
                    b.heroParalyzed = true;
                    this.log(`${this.hero.name} is paralyzed!`, 'enemy');
                    this.updateBattleUI();
                    return;
                } else {
                    this.log(`... but it MISSES!`, 'enemy');
                    return;
                }
            }

            dmg = Math.round(baseDmg * (useSkill.mult || 1));
            if (useSkill.alwaysHit) this.log(`(Always hits!)`, 'enemy');
        } else {
            dmg = baseDmg;
            this.log(`${b.monster} attacks!`, 'enemy');
        }

        if (!useSkill || !useSkill.alwaysHit) {
            if (Math.random() >= data.hitRate) {
                this.log(`... but it MISSES!`, 'enemy');
                this.updateBattleUI();
                return;
            }
        }

        if (this.hero.unkillableTurns > 0) {
            this.hero.hp = 1;
            this.log(`${this.hero.name} is unkillable! HP dropped to 1.`, 'info');
        } else {
            this.hero.hp -= dmg;
            this.log(`${b.monster} deals ${dmg} damage!`, 'enemy');
            if (this.hero.hp < 0) this.hero.hp = 0;
        }
        this.updateBattleUI();

        if (this.hero.hp <= 0) { this.hero.hp = 0; this.endBattle(false); }
    },

    endRound() {
        const b = this.battle;
        if (!b || b.over) return;

        // Decrement hero buffs
        if (this.hero.atkSpdBuffTurns > 0) {
            this.hero.atkSpdBuffTurns--;
            if (this.hero.atkSpdBuffTurns === 0) this.hero.atkSpdBuff = 0;
        }
        if (this.hero.atkDmgBuffTurns > 0) {
            this.hero.atkDmgBuffTurns--;
            if (this.hero.atkDmgBuffTurns === 0) this.hero.atkDmgBuff = 0;
        }
        if (this.hero.unkillableTurns > 0) this.hero.unkillableTurns--;
        if (this.hero.healTurns > 0) {
            const heal = Math.round(this.getMaxHp() * this.hero.healPct);
            this.hero.hp = Math.min(this.getMaxHp(), this.hero.hp + heal);
            this.hero.healTurns--;
            if (this.hero.healTurns === 0) this.hero.healPct = 0;
            this.log(`Healing Ward restores ${heal} HP!`, 'hero');
        }

        // Cooldown is now round-based (usedAtRound + cooldown),
        // no decrement needed here.

        b.round++;
        const counts = this.computeAttacksPerRound();
        b.heroAttacksLeft = counts.heroAttacks;
        b.enemyAttacksLeft = counts.enemyAttacks;

        this.log(`— Round ${b.round} —`, 'info');
        this.updateBattleUI();
        this.enableActions(true);
    },

    heroAttack() {
        if (!this.battle || this.battle.over) return;
        this.enableActions(false);
        const b = this.battle;
        const atk = this.getTotalAttack();

        let dmg = atk.melee;
        if (this.equippedItem) {
            if (this.equippedItem.stat === 'range') dmg = atk.range;
            else if (this.equippedItem.stat === 'magic') dmg = atk.magic;
        }

        if (Math.random() < 0.20) {
            this.log(`${this.hero.name} attacks... but MISSES!`, 'hero');
        } else {
            b.monsterHp -= dmg;
            this.log(`${this.hero.name} attacks for ${dmg} damage!`, 'hero');
        }
        this.updateBattleUI();

        if (b.monsterHp <= 0) { b.monsterHp = 0; this.updateBattleUI(); this.endBattle(true); return; }
        this.proceedAfterHeroAction();
    },

    openSkillPanel() {
        if (!this.battle || this.battle.over) return;
        const skills = this.getAvailableSkills();
        if (skills.length === 0) { this.log('No skills available!', 'info'); return; }
        const panel = document.getElementById('skill-panel');
        const options = document.getElementById('skill-options');
        options.innerHTML = '';
        const currentRound = this.battle.round;

        skills.forEach(s => {
            const btn = document.createElement('button');
            const cdLeft = this.getCooldownLeft(s.id, currentRound);
            const canUse = this.hero.mp >= s.mp && cdLeft === 0;
            btn.className = 'skill-option-btn' + (canUse ? '' : ' disabled');
            btn.disabled = !canUse;
            btn.innerHTML = `
                <span class="skill-option-name">${s.name}</span>
                <span class="skill-option-cost">${s.mp} MP${cdLeft > 0 ? ' • CD ' + cdLeft : ''}</span>
                <span class="skill-option-effect">+${Math.round(s.mult * 100)}% ${s.dmgType} damage${s.recoil ? ' • ' + (s.recoil * 100) + '% recoil' : ''}${s.slow ? ' • Slow ' + (s.slow * 100) + '%' : ''}${s.cooldown ? ' • CD ' + s.cooldown + ' turns' : ''}</span>
            `;
            btn.addEventListener('click', () => this.useSkill(s));
            options.appendChild(btn);
        });
        panel.classList.remove('hidden');
    },

    closeSkillPanel() {
        const panel = document.getElementById('skill-panel');
        if (panel) panel.classList.add('hidden');
    },

    useSkill(skill) {
        if (!this.battle || this.battle.over) return;
        if (this.hero.mp < skill.mp) { this.log(`Not enough MP!`, 'info'); return; }

        const currentRound = this.battle.round;
        const cdLeft = this.getCooldownLeft(skill.id, currentRound);
        if (cdLeft > 0) {
            this.log(`${skill.name} on cooldown (${cdLeft} turns left).`, 'info');
            return;
        }

        this.closeSkillPanel();
        this.enableActions(false);
        this.hero.mp -= skill.mp;

        const b = this.battle;

        // Set cooldown: simpan di ronde berapa dipakai
        if (skill.cooldown) {
            if (!this.hero.cooldowns) this.hero.cooldowns = {};
            this.hero.cooldowns[skill.id] = {
                usedAtRound: currentRound,
                cooldown: skill.cooldown
            };
        }

        // Self-buff skills
        if (skill.atkSpdBuff) {
            this.hero.atkSpdBuff = skill.atkSpdBuff;
            this.hero.atkSpdBuffTurns = skill.atkSpdBuffTurns;
            this.log(`${this.hero.name} gains +${skill.atkSpdBuff * 100}% Attack Speed for ${skill.atkSpdBuffTurns} turns!`, 'hero');
        }
        if (skill.selfAtkDmgBuff) {
            this.hero.atkDmgBuff = skill.selfAtkDmgBuff;
            this.hero.atkDmgBuffTurns = skill.buffTurns;
            this.log(`${this.hero.name} gains +${skill.selfAtkDmgBuff * 100}% Attack Damage for ${skill.buffTurns} turns!`, 'hero');
        }
        if (skill.selfAtkSpdBuff) {
            this.hero.atkSpdBuff = skill.selfAtkSpdBuff;
            this.hero.atkSpdBuffTurns = skill.buffTurns;
            this.log(`${this.hero.name} gains +${skill.selfAtkSpdBuff * 100}% Attack Speed for ${skill.buffTurns} turns!`, 'hero');
        }
        if (skill.unkillable) {
            this.hero.unkillableTurns = skill.unkillable;
            this.log(`${this.hero.name} is unkillable for ${skill.unkillable} turns!`, 'hero');
        }
        if (skill.healPct) {
            this.hero.healPct = skill.healPct;
            this.hero.healTurns = skill.healTurns;
            this.log(`${this.hero.name} gains healing ward (${skill.healPct * 100}% HP per turn, ${skill.healTurns} turns)!`, 'hero');
        }
        if (skill.revive && this.hero.hp <= 0) {
            this.hero.hp = Math.round(this.getMaxHp() * skill.revive);
            this.log(`${this.hero.name} is revived with ${this.hero.hp} HP!`, 'hero');
        }
        if (skill.refreshCooldowns) {
            this.hero.cooldowns = {};
            this.log(`All cooldowns refreshed!`, 'hero');
        }

        // Pure buff skill (no damage)
        if (skill.mult === 0) {
            this.updateBattleUI();
            this.proceedAfterHeroAction();
            return;
        }

        const atk = this.getTotalAttack();
        let baseDmg;
        if (skill.dmgType === 'magic') baseDmg = atk.magic;
        else if (skill.dmgType === 'range') baseDmg = atk.range;
        else baseDmg = atk.melee;

        let dmg = Math.round(baseDmg * (1 + skill.mult));

        this.log(`${this.hero.name} uses ${skill.name}!`, 'hero');

        let hit = true;
        if (!skill.alwaysHit && Math.random() < 0.20) hit = false;

        if (!hit) {
            this.log(`... but MISSES!`, 'hero');
        } else {
            b.monsterHp -= dmg;
            this.log(`${skill.name} deals ${dmg} damage!`, 'hero');

            if (skill.slow) {
                b.monsterSlowed = 3;
                this.log(`${b.monster} is slowed!`, 'info');
            }
            if (skill.lifesteal) {
                const heal = Math.round(dmg * skill.lifesteal);
                this.hero.hp = Math.min(this.getMaxHp(), this.hero.hp + heal);
                this.log(`${this.hero.name} steals ${heal} HP!`, 'hero');
            }
            if (skill.bleed) {
                b.monsterBleed = skill.bleed;
                b.monsterBleedTurns = skill.bleedTurns;
                this.log(`${b.monster} is bleeding!`, 'info');
            }
        }

        if (skill.recoil && b.monsterHp > 0) {
            const recoilDmg = Math.round(this.getMaxHp() * skill.recoil);
            this.hero.hp -= recoilDmg;
            this.log(`${this.hero.name} takes ${recoilDmg} recoil damage!`, 'info');
            if (this.hero.hp <= 0) this.hero.hp = 0;
        }

        this.updateBattleUI();

        if (this.hero.hp <= 0) { this.endBattle(false); return; }
        if (b.monsterHp <= 0) { b.monsterHp = 0; this.updateBattleUI(); this.endBattle(true); return; }
        this.proceedAfterHeroAction();
    },

    async endBattle(win) {
        const b = this.battle;
        b.over = true;
        this.enableActions(false);
        this.closeSkillPanel();

        let jobChoiceNeeded = false;

        if (win) {
            this.log(`${b.monster} is defeated!`, 'win');
            const expGain = b.monsterData.exp;
            this.log(`+${expGain} EXP`, 'win');
            const result = this.gainExp(expGain);
            jobChoiceNeeded = result.reachedJobChoice;

            const drop = this.rollDrop(b.monsterData);
            if (drop) {
                if (this.inventory.length < this.inventorySlots) {
                    this.inventory.push(drop);
                    this.log(`Item dropped: ${drop.name}`, 'win');
                } else {
                    this.log(`Inventory full!`, 'info');
                }
            } else {
                this.log(`No item dropped.`, 'info');
            }

            if (result.leveled) {
                this.log(`${this.hero.name} LEVELED UP to ${this.hero.level}!`, 'win');
            }
        } else {
            this.log(`${this.hero.name} has been defeated...`, 'lose');
            this.log(`HP and MP fully restored.`, 'info');
            this.hero.hp = this.getMaxHp();
            this.hero.mp = this.getMaxMp();
            this.hero.cooldowns = {};
            this.hero.atkSpdBuff = 0; this.hero.atkSpdBuffTurns = 0;
            this.hero.atkDmgBuff = 0; this.hero.atkDmgBuffTurns = 0;
            this.hero.unkillableTurns = 0;
            this.hero.healPct = 0; this.hero.healTurns = 0;
        }

        await this.save();
        this.render();

        setTimeout(() => {
            if (jobChoiceNeeded) { this.showJobModal(); return; }
            const actions = document.getElementById('battle-actions');
            if (win) {
                actions.innerHTML = `
                    <button id="attack-again-btn" class="btn-primary">⚔️ Attack Again</button>
                    <button id="return-btn" class="btn-secondary" style="grid-column: span 2;">Return to Enemy Select</button>
                `;
            } else {
                actions.innerHTML = `
                    <button id="retry-btn" class="btn-primary">🔄 Retry</button>
                    <button id="return-btn" class="btn-secondary" style="grid-column: span 2;">Return to Enemy Select</button>
                `;
            }
        }, 800);
    },

    showJobModal() {
        this.pendingJobChoice = true;
        const modal = document.getElementById('job-modal');
        const container = modal.querySelector('.job-options');
        const subtitle = modal.querySelector('.modal-subtitle');

        let jobList = [];
        if (!this.hero.job) {
            subtitle.textContent = "You have reached Level 10. Choose your first job.";
            jobList = ['Warrior', 'Archer', 'Mage'];
        } else if (JOB_TREE[this.hero.job]) {
            subtitle.textContent = `You have reached Level 20. Choose your advanced ${this.hero.job} path.`;
            jobList = JOB_TREE[this.hero.job];
        }

        container.innerHTML = '';
        jobList.forEach(jobName => {
            const bonus = JOB_BONUS[jobName] || {};
            const card = document.createElement('div');
            card.className = 'job-card';
            card.dataset.job = jobName;
            card.innerHTML = `
                <h3>${jobName}</h3>
                <p class="job-bonus">+${bonus.str || 0} STR, +${bonus.agi || 0} AGI, +${bonus.int || 0} INT${bonus.hp ? ', +' + bonus.hp + ' HP' : ''}${bonus.mp ? ', +' + bonus.mp + ' MP' : ''}</p>
            `;
            const skills = Object.values(SKILLS).filter(s => s.class === jobName);
            skills.forEach(s => {
                const p = document.createElement('p');
                p.className = 'job-skill';
                p.textContent = `Lv${s.minLevel}: ${s.name} (+${Math.round(s.mult * 100)}%, ${s.mp}MP, CD ${s.cooldown || 0} turns)`;
                card.appendChild(p);
            });
            card.addEventListener('click', async () => {
                if (!confirm(`Choose ${jobName} as your job? This cannot be changed.`)) return;
                await this.chooseJob(jobName);
                modal.classList.add('hidden');
                const actions = document.getElementById('battle-actions');
                actions.innerHTML = `
                    <button id="return-btn" class="btn-primary" style="grid-column: 1 / -1;">Continue</button>
                `;
                alert(`You are now a ${jobName}! New skills unlocked.`);
            });
            container.appendChild(card);
        });

        modal.classList.remove('hidden');
    },

    rollDrop(monsterData) {
        if (Math.random() > 0.25) return null;
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const [tier, chance] of Object.entries(monsterData.drop)) {
            cumulative += chance;
            if (roll < cumulative) {
                const type = monsterData.dropItems[Math.floor(Math.random() * monsterData.dropItems.length)];
                return this.generateItem(tier, type);
            }
        }
        return null;
    },

    exitBattle() {
        this.battle = null;
        document.getElementById('enemy-select').classList.remove('hidden');
        document.getElementById('battle-screen').classList.add('hidden');
        document.getElementById('skill-panel').classList.add('hidden');
        const actions = document.getElementById('battle-actions');
        actions.style.gridTemplateColumns = 'repeat(3, 1fr)';
        actions.innerHTML = `
            <button id="action-attack" class="btn-primary">Attack</button>
            <button id="action-skill" class="btn-primary">Skill</button>
            <button id="action-leave" class="btn-danger">Leave Battle</button>
        `;
        this.render();
    },

    leaveBattle() {
        if (!confirm('Leave battle? You will not gain rewards.')) return;
        this.battle = null;
        this.exitBattle();
    }
};

export { Game };
/* ============================================================
   Core Game Logic - With Job & Skill System + Attack Speed
   ============================================================ */

import { DB } from './database.js';
import { Auth } from './auth.js';

const TIERS = ['White', 'Green', 'Blue', 'Purple', 'Red', 'Gold'];
const TIER_MULT = { White: 1, Green: 1.5, Blue: 2.25, Purple: 3.375, Red: 5.0625, Gold: 7.59375 };
const ENHANCE_COST = { White: 100, Green: 250, Blue: 500, Purple: 1000, Red: 2500 };
const DISMANTLE_YIELD = { White: 2, Green: 4, Blue: 8, Purple: 12, Red: 16 };

const EXP_TABLE = {
    1: 100, 2: 235, 3: 485, 4: 890, 5: 1345, 6: 1720, 7: 2065, 8: 2815, 9: 3240,
    10: 3810, 11: 4595, 12: 4990, 13: 5675, 14: 6535, 15: 7410, 16: 8450, 17: 9887, 18: 11111, 19: 13567
};

const WEAPON_TYPES = {
    Knife: { stat: 'melee', base: 3, allowedJobs: ['Novice', 'Warrior', 'Archer', 'Mage'] },
    Sword: { stat: 'melee', base: 6, allowedJobs: ['Warrior'] },
    Bow:   { stat: 'melee', base: 8, allowedJobs: ['Archer'] },
    Staff: { stat: 'magic', base: 10, allowedJobs: ['Mage'] }
};

const JOB_BONUS = {
    Warrior: { str: 5, agi: 1, int: 1, hp: 10, mp: 0 },
    Archer:  { str: 2, agi: 5, int: 0, hp: 5,  mp: 0 },
    Mage:    { str: 1, agi: 1, int: 5, hp: 0,  mp: 10 }
};

const ATTR_SCALING = {
    Novice:  { hpPerStr: 2, mpPerInt: 3, meleePctPerStr: 0.10, rangePctPerAgi: 0.15, magicPctPerInt: 0.15, atkSpdPctPerAgi: 0.20 },
    Warrior: { hpPerStr: 3, mpPerInt: 2, meleePctPerStr: 0.15, rangePctPerAgi: 0,    magicPctPerInt: 0,    atkSpdPctPerAgi: 0.10 },
    Archer:  { hpPerStr: 2, mpPerInt: 2, meleePctPerStr: 0,    rangePctPerAgi: 0.15, magicPctPerInt: 0,    atkSpdPctPerAgi: 0.20 },
    Mage:    { hpPerStr: 2, mpPerInt: 3, meleePctPerStr: 0,    rangePctPerAgi: 0,    magicPctPerInt: 0.15, atkSpdPctPerAgi: 0.15 }
};

const SKILLS = {
    Slash:          { name: 'Slash',           mp: 3,  mult: 0.35, dmgType: 'melee', source: 'base',  minLevel: 1,  class: 'Novice'  },
    SwordDance:     { name: 'Sword Dance',     mp: 5,  mult: 0.60, dmgType: 'melee', source: 'class', minLevel: 12, class: 'Warrior' },
    FlyingSword:    { name: 'Flying Sword',    mp: 12, mult: 1.50, dmgType: 'melee', source: 'class', minLevel: 18, class: 'Warrior', recoil: 0.05 },
    PiercingShot:   { name: 'Piercing Shot',   mp: 5,  mult: 0.75, dmgType: 'range', source: 'class', minLevel: 12, class: 'Archer'  },
    ArrowShower:    { name: 'Arrow Shower',    mp: 10, mult: 1.25, dmgType: 'range', source: 'class', minLevel: 18, class: 'Archer'  },
    Fireball:       { name: 'Fireball',        mp: 5,  mult: 0.50, dmgType: 'magic', source: 'class', minLevel: 12, class: 'Mage'    },
    LightningShock: { name: 'Lightning Shock', mp: 8,  mult: 0.75, dmgType: 'magic', source: 'class', minLevel: 15, class: 'Mage'    },
    FreezingField:  { name: 'Freezing Field',  mp: 12, mult: 1.20, dmgType: 'magic', source: 'class', minLevel: 18, class: 'Mage', slow: 0.30 }
};

const MONSTERS = {
    Chicken: { hp: 15, mp: 0, atkMin: 1, atkMax: 3, atkSpd: 8, exp: 8, skills: [],
        drop: { White: 99, Green: 1 } },
    Sheep:   { hp: 30, mp: 0, atkMin: 2, atkMax: 5, atkSpd: 11, exp: 13, skills: [],
        drop: { White: 98, Green: 2 } },
    Cow:     { hp: 60, mp: 0, atkMin: 4, atkMax: 8, atkSpd: 13, exp: 17, skills: [],
        drop: { White: 95, Green: 4, Blue: 1 } },
    Dog:     { hp: 100, mp: 10, atkMin: 7, atkMax: 10, atkSpd: 15, exp: 23,
        skills: [{ name: 'Bark', mp: 3, mult: 1.20 }],
        drop: { White: 90, Green: 7, Blue: 2.5, Purple: 0.5 } },
    Lion:    { hp: 150, mp: 25, atkMin: 10, atkMax: 15, atkSpd: 18, exp: 32,
        skills: [{ name: 'Growling', mp: 4, mult: 0, stun: true }, { name: 'Scratch', mp: 5, mult: 1.35 }],
        drop: { White: 85, Green: 10, Blue: 3, Purple: 1.5, Red: 0.49, Gold: 0.01 } }
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

    /* ---------- Scaling ---------- */
    getScaling() {
        if (!this.hero || !this.hero.job) return ATTR_SCALING.Novice;
        return ATTR_SCALING[this.hero.job] || ATTR_SCALING.Novice;
    },

    /* ---------- Hero Creation ---------- */
    async createHero(name, username, isGuest) {
        this.username = username;
        this.isGuest = isGuest;
        this.hero = {
            name: name,
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
            bonusMp: 0
        };
        this.inventory = [];
        this.iron = 0;
        this.equippedItem = null;

        const knife = this.generateItem('White', 'Knife');
        this.equippedItem = knife;

        await this.save();
        this.render();
    },

    /* ---------- Item Generation ---------- */
    generateItem(tier, typeOverride, customBase) {
        const type = typeOverride || ['Knife', 'Sword', 'Bow', 'Staff'][Math.floor(Math.random() * 4)];
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
            allowedJobs: def.allowedJobs
        };
    },

    /* ---------- Stats Calculation ---------- */
    getTotalAttack() {
        const s = this.getScaling();
        let melee = this.hero.baseAtk;
        let range = this.hero.baseAtk;
        let magic = this.hero.baseAtk;

        melee += melee * (this.hero.str * s.meleePctPerStr);
        range += range * (this.hero.agi * s.rangePctPerAgi);
        magic += magic * (this.hero.int * s.magicPctPerInt);

        if (this.equippedItem) {
            if (this.equippedItem.stat === 'melee') {
                if (this.equippedItem.type === 'Bow') range += this.equippedItem.value;
                else melee += this.equippedItem.value;
            } else if (this.equippedItem.stat === 'magic') {
                magic += this.equippedItem.value;
            }
        }
        return { melee: Math.round(melee), range: Math.round(range), magic: Math.round(magic) };
    },

    getAttackSpeed() {
        const s = this.getScaling();
        let spd = this.hero.baseSpd;
        spd += spd * (this.hero.agi * s.atkSpdPctPerAgi);
        return Math.round(spd);
    },

    getMaxHp() {
        const s = this.getScaling();
        return 10 + (this.hero.bonusHp || 0) + (this.hero.str * s.hpPerStr);
    },
    getMaxMp() {
        const s = this.getScaling();
        return 10 + (this.hero.bonusMp || 0) + (this.hero.int * s.mpPerInt);
    },

    /* ---------- Skills ---------- */
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

    /* ---------- Weapon Restriction ---------- */
    canEquip(item) {
        if (!item) return false;
        if (item.type === 'Knife') return true;
        if (item.type === 'Sword') return this.hero.job === 'Warrior';
        if (item.type === 'Bow') return this.hero.job === 'Archer';
        if (item.type === 'Staff') return this.hero.job === 'Mage';
        return false;
    },

    /* ---------- EXP / Level ---------- */
    gainExp(amount) {
        this.hero.exp += amount;
        let leveled = false;
        let reachedJobChoice = false;

        while (this.hero.level < 20 && this.hero.exp >= EXP_TABLE[this.hero.level]) {
            this.hero.exp -= EXP_TABLE[this.hero.level];
            this.hero.level++;
            leveled = true;
            this.hero.statPoints += 3;

            if (this.hero.level === 11 && !this.hero.job) {
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
        if (this.hero.job) return;

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

    /* ---------- Save / Load ---------- */
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

        // Migrasi data lama
        if (this.hero.statPoints === undefined) this.hero.statPoints = (this.hero.level - 1) * 3;
        if (this.hero.bonusHp === undefined) this.hero.bonusHp = 0;
        if (this.hero.bonusMp === undefined) this.hero.bonusMp = 0;
        if (this.hero.job === undefined) this.hero.job = null;

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

    /* ---------- Rendering ---------- */
    render() {
        if (!this.hero) return;

        document.getElementById('profile-hero-name').textContent = this.hero.name;
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
            if (this.equippedItem.type === 'Bow') displayAtk = atk.range;
            else if (this.equippedItem.stat === 'magic') displayAtk = atk.magic;
        }
        document.getElementById('stat-atk').textContent = displayAtk;
        document.getElementById('stat-spd').textContent = this.getAttackSpeed();

        const eqEl = document.getElementById('equipped-item');
        if (this.equippedItem) {
            eqEl.innerHTML = `<p class="tier-${this.equippedItem.tier.toLowerCase()}">${this.equippedItem.name}</p>
                              <p>+${this.equippedItem.value} ${this.equippedItem.stat === 'melee' ? 'Melee' : 'Magic'} Damage</p>`;
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
        el.innerHTML = skills.map(s => `
            <div class="skill-info">
                <span class="skill-name">${s.name}</span>
                <span class="skill-mp">${s.mp} MP</span>
                <span class="skill-desc">+${Math.round(s.mult * 100)}% ${s.dmgType} damage${s.recoil ? ' (recoil ' + (s.recoil * 100) + '% HP)' : ''}${s.slow ? ' (slow ' + (s.slow * 100) + '%)' : ''}</span>
            </div>
        `).join('');
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
        document.getElementById('selected-item-stats').textContent =
            `+${item.value} ${item.stat === 'melee' ? 'Melee' : 'Magic'} Damage | Tier: ${item.tier}`;

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

        if (!this.canEquip(item)) {
            alert(`Cannot equip ${item.type}! ${item.type} is restricted to ${item.allowedJobs.join(', ')}.`);
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
            alert('Inventory is full! Discard or dismantle an item first.');
            return;
        }
        this.inventory.push(this.equippedItem);
        this.equippedItem = null;
        this.render();
        this.renderInventory();
        await this.save();
    },

    async allocateStat(stat) {
        if (!this.hero) return;
        if (this.hero.statPoints <= 0) {
            alert('No stat points available!');
            return;
        }
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
       BATTLE WITH ATTACK SPEED
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
            monsterSlowed: 0,
            over: false,
            round: 1,
            heroAttacksLeft: 0,
            enemyAttacksLeft: 0,
            waitingForNextRound: false
        };

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
        if (heroStatus) heroStatus.textContent = b.heroStunned ? '💫 STUNNED' : '';
        if (enemyStatus) enemyStatus.textContent = b.monsterSlowed > 0 ? '❄️ SLOWED' : '';
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

        if (b.monsterHp <= 0) {
            b.monsterHp = 0;
            this.updateBattleUI();
            this.endBattle(true);
            return;
        }

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

        if (b.heroStunned) {
            this.log(`${this.hero.name} is stunned and cannot act!`, 'info');
            b.heroStunned = false;
            this.updateBattleUI();
            this.endRound();
            return;
        }

        if (b.enemyAttacksLeft <= 0) {
            this.endRound();
            return;
        }

        if (b.monsterSlowed > 0) {
            b.monsterSlowed--;
            if (Math.random() < 0.30) {
                this.log(`${b.monster} is slowed and skips its attack!`, 'info');
                this.updateBattleUI();
                b.enemyAttacksLeft--;
                if (b.enemyAttacksLeft > 0) {
                    setTimeout(() => this.enemyTurnLoop(), 500);
                } else {
                    this.endRound();
                }
                return;
            }
        }

        this.enemySingleAttack();

        if (b.over) return;

        b.enemyAttacksLeft--;
        if (b.enemyAttacksLeft > 0) {
            setTimeout(() => this.enemyTurnLoop(), 600);
        } else {
            this.endRound();
        }
    },

    enemySingleAttack() {
        const b = this.battle;
        const data = b.monsterData;

        let useSkill = null;
        if (data.skills.length > 0 && Math.random() < 0.30) {
            const affordable = data.skills.filter(s => b.monsterMp >= s.mp);
            if (affordable.length > 0) {
                useSkill = affordable[Math.floor(Math.random() * affordable.length)];
            }
        }

        const baseDmg = Math.floor(Math.random() * (data.atkMax - data.atkMin + 1)) + data.atkMin;
        let dmg;

        if (useSkill && useSkill.stun) {
            b.monsterMp -= useSkill.mp;
            this.log(`${b.monster} uses ${useSkill.name}!`, 'enemy');
            if (Math.random() < 0.20) {
                this.log(`... but it MISSES!`, 'enemy');
            } else {
                b.heroStunned = true;
                this.log(`${this.hero.name} is stunned for 1 turn!`, 'enemy');
            }
            this.updateBattleUI();
            return;
        }

        if (useSkill) {
            b.monsterMp -= useSkill.mp;
            dmg = Math.round(baseDmg * useSkill.mult);
            this.log(`${b.monster} uses ${useSkill.name}!`, 'enemy');
        } else {
            dmg = baseDmg;
            this.log(`${b.monster} attacks!`, 'enemy');
        }

        if (Math.random() < 0.20) {
            this.log(`... but it MISSES!`, 'enemy');
        } else {
            this.hero.hp -= dmg;
            this.log(`${b.monster} deals ${dmg} damage!`, 'enemy');
            if (this.hero.hp < 0) this.hero.hp = 0;
        }
        this.updateBattleUI();

        if (this.hero.hp <= 0) {
            this.hero.hp = 0;
            this.endBattle(false);
        }
    },

    endRound() {
        const b = this.battle;
        if (!b || b.over) return;

        b.round++;
        const counts = this.computeAttacksPerRound();
        b.heroAttacksLeft = counts.heroAttacks;
        b.enemyAttacksLeft = counts.enemyAttacks;

        this.log(`— Round ${b.round} —`, 'info');
        this.enableActions(true);
    },

    /* ---------- Hero Actions ---------- */
    heroAttack() {
        if (!this.battle || this.battle.over) return;
        this.enableActions(false);
        const b = this.battle;
        const atk = this.getTotalAttack();

        let dmg = atk.melee;
        if (this.equippedItem) {
            if (this.equippedItem.type === 'Bow') dmg = atk.range;
            else if (this.equippedItem.stat === 'magic') dmg = atk.magic;
        }

        if (Math.random() < 0.20) {
            this.log(`${this.hero.name} attacks... but MISSES!`, 'hero');
        } else {
            b.monsterHp -= dmg;
            this.log(`${this.hero.name} attacks for ${dmg} damage!`, 'hero');
        }
        this.updateBattleUI();

        if (b.monsterHp <= 0) {
            b.monsterHp = 0;
            this.updateBattleUI();
            this.endBattle(true);
            return;
        }
        this.proceedAfterHeroAction();
    },

    openSkillPanel() {
        if (!this.battle || this.battle.over) return;
        const skills = this.getAvailableSkills();
        if (skills.length === 0) {
            this.log('No skills available!', 'info');
            return;
        }
        const panel = document.getElementById('skill-panel');
        const options = document.getElementById('skill-options');
        options.innerHTML = '';
        skills.forEach(s => {
            const btn = document.createElement('button');
            const canUse = this.hero.mp >= s.mp;
            btn.className = 'skill-option-btn' + (canUse ? '' : ' disabled');
            btn.disabled = !canUse;
            btn.innerHTML = `
                <span class="skill-option-name">${s.name}</span>
                <span class="skill-option-cost">${s.mp} MP</span>
                <span class="skill-option-effect">+${Math.round(s.mult * 100)}% ${s.dmgType} damage${s.recoil ? ' • ' + (s.recoil * 100) + '% recoil' : ''}${s.slow ? ' • Slow ' + (s.slow * 100) + '%' : ''}</span>
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
        if (this.hero.mp < skill.mp) {
            this.log(`Not enough MP for ${skill.name}!`, 'info');
            return;
        }
        this.closeSkillPanel();
        this.enableActions(false);
        this.hero.mp -= skill.mp;
        const b = this.battle;
        const atk = this.getTotalAttack();

        let baseDmg;
        if (skill.dmgType === 'magic') baseDmg = atk.magic;
        else if (skill.dmgType === 'range') baseDmg = atk.range;
        else baseDmg = atk.melee;

        let dmg = Math.round(baseDmg * (1 + skill.mult));

        this.log(`${this.hero.name} uses ${skill.name}!`, 'hero');
        if (Math.random() < 0.20) {
            this.log(`... but MISSES!`, 'hero');
        } else {
            b.monsterHp -= dmg;
            this.log(`${skill.name} deals ${dmg} damage!`, 'hero');

            if (skill.slow) {
                b.monsterSlowed = 3;
                this.log(`${b.monster} is slowed!`, 'info');
            }
        }

        if (skill.recoil && b.monsterHp > 0) {
            const recoilDmg = Math.round(this.getMaxHp() * skill.recoil);
            this.hero.hp -= recoilDmg;
            this.log(`${this.hero.name} takes ${recoilDmg} recoil damage!`, 'info');
            if (this.hero.hp <= 0) this.hero.hp = 0;
        }

        this.updateBattleUI();

        if (this.hero.hp <= 0) {
            this.endBattle(false);
            return;
        }
        if (b.monsterHp <= 0) {
            b.monsterHp = 0;
            this.updateBattleUI();
            this.endBattle(true);
            return;
        }
        this.proceedAfterHeroAction();
    },

    /* ---------- Battle End ---------- */
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

            const drop = this.rollDrop(b.monsterData.drop);
            if (drop) {
                if (this.inventory.length < this.inventorySlots) {
                    this.inventory.push(drop);
                    this.log(`Item dropped: ${drop.name}`, 'win');
                } else {
                    this.log(`Inventory full! ${drop.name} was lost.`, 'info');
                }
            } else {
                this.log(`No item dropped.`, 'info');
            }

            if (result.leveled) {
                this.log(`${this.hero.name} LEVELED UP to ${this.hero.level}!`, 'win');
            }
        } else {
            this.log(`${this.hero.name} has been defeated...`, 'lose');
            this.log(`HP and MP fully restored. You may battle again.`, 'info');
            this.hero.hp = this.getMaxHp();
            this.hero.mp = this.getMaxMp();
        }

        await this.save();
        this.render();

        setTimeout(() => {
            if (jobChoiceNeeded) {
                this.showJobModal();
                return;
            }

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
        document.getElementById('job-modal').classList.remove('hidden');
    },

    rollDrop(dropTable) {
        if (Math.random() > 0.25) return null;
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const [tier, chance] of Object.entries(dropTable)) {
            cumulative += chance;
            if (roll < cumulative) {
                return this.generateItem(tier);
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
/* ============================================================
   Main Entry Point & Navigation (Tab Layout)
   ============================================================ */

import { Auth } from './auth.js';
import { Game } from './game.js';

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(pageId);
    if (el) el.classList.add('active');

    if (pageId === 'page-app') {
        Game.render();
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-page').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');

    const btn = document.querySelector(`.nav-tab[data-tab-page="${tabName}"]`);
    if (btn) btn.classList.add('active');

    // Refresh content per tab
    if (tabName === 'profile') Game.render();
    else if (tabName === 'inventory') Game.renderInventory();
    else if (tabName === 'battle') {
        Game.renderEnemies();
        document.getElementById('enemy-select').classList.remove('hidden');
        document.getElementById('battle-screen').classList.add('hidden');
        document.getElementById('skill-panel').classList.add('hidden');
        Game.battle = null;
    }
}

// Expose ke global
window.showPage = showPage;
window.showTab = showTab;

document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Auth.initHeroName();

    // Tab switching (sidebar)
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', () => showTab(btn.dataset.tabPage));
    });

    // Stat allocation
    document.querySelectorAll('.stat-plus-btn').forEach(btn => {
        btn.addEventListener('click', () => Game.allocateStat(btn.dataset.stat));
    });

    // Battle actions (event delegation)
    document.getElementById('battle-actions').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        switch (btn.id) {
            case 'action-attack': Game.heroAttack(); break;
            case 'action-skill': Game.openSkillPanel(); break;
            case 'action-leave': Game.leaveBattle(); break;
            case 'attack-again-btn':
            case 'retry-btn': {
                const lastMonster = Game.battle?.monster;
                if (lastMonster) {
                    Game.exitBattle();
                    Game.startBattle(lastMonster);
                }
                break;
            }
            case 'return-btn': Game.exitBattle(); break;
        }
    });

    // Skill panel cancel
    document.getElementById('skill-cancel-btn').addEventListener('click', () => Game.closeSkillPanel());

    // Inventory actions
    document.getElementById('item-equip-btn').addEventListener('click', () => {
        const idx = parseInt(document.getElementById('item-action-panel').dataset.index);
        Game.equipItem(idx);
    });
    document.getElementById('item-enhance-btn').addEventListener('click', () => {
        const idx = parseInt(document.getElementById('item-action-panel').dataset.index);
        Game.enhanceItem(idx);
    });
    document.getElementById('item-dismantle-btn').addEventListener('click', () => {
        const idx = parseInt(document.getElementById('item-action-panel').dataset.index);
        Game.dismantleItem(idx);
    });
    document.getElementById('item-discard-btn').addEventListener('click', () => {
        const idx = parseInt(document.getElementById('item-action-panel').dataset.index);
        Game.discardItem(idx);
    });
    document.getElementById('item-close-btn').addEventListener('click', () => Game.closeItemPanel());

    // Unequip
    document.getElementById('unequip-btn').addEventListener('click', () => Game.unequipItem());
});
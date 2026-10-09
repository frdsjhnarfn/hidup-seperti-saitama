/* ============================================================
   Main Entry Point & Navigation
   ============================================================ */

import { Auth } from './auth.js';
import { Game } from './game.js';

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'page-profile') {
        Game.render();
    } else if (pageId === 'page-battle') {
        Game.renderEnemies();
        document.getElementById('enemy-select').classList.remove('hidden');
        document.getElementById('battle-screen').classList.add('hidden');
        document.getElementById('skill-panel').classList.add('hidden');
        Game.battle = null;
    } else if (pageId === 'page-inventory') {
        Game.renderInventory();
    }
}

// Expose showPage ke global untuk dipakai auth.js
window.showPage = showPage;

document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Auth.initHeroName();

    // Stat allocation
    document.querySelectorAll('.stat-plus-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            Game.allocateStat(btn.dataset.stat);
        });
    });

    // Nav buttons
    document.querySelectorAll('.nav-btn, [data-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.nav;
            if (target === 'battle') showPage('page-battle');
            else if (target === 'inventory') showPage('page-inventory');
            else if (target === 'profile') showPage('page-profile');
        });
    });

    // Battle actions (event delegation)
    document.getElementById('battle-actions').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        switch (btn.id) {
            case 'action-attack':
                Game.heroAttack();
                break;
            case 'action-skill':
                Game.openSkillPanel();
                break;
            case 'action-leave':
                Game.leaveBattle();
                break;
            case 'attack-again-btn':
            case 'retry-btn': {
                const lastMonster = Game.battle?.monster;
                if (lastMonster) {
                    Game.exitBattle();
                    Game.startBattle(lastMonster);
                }
                break;
            }
            case 'return-btn':
                Game.exitBattle();
                break;
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

    // Job selection
    document.querySelectorAll('.job-card').forEach(card => {
        card.addEventListener('click', () => {
            const job = card.dataset.job;
            if (!confirm(`Choose ${job} as your job? This cannot be changed.`)) return;
            Game.chooseJob(job);
            document.getElementById('job-modal').classList.add('hidden');

            const actions = document.getElementById('battle-actions');
            actions.innerHTML = `
                <button id="return-btn" class="btn-primary" style="grid-column: 1 / -1;">Continue</button>
            `;

            alert(`You are now a ${job}! New skills unlocked.`);
        });
    });
});
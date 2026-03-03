import Phaser from 'phaser';
import { SCENE_KEYS, MESSAGE_MAX_LENGTH, CATALOG_SIZE } from '../utils/constants';
import { gameStore } from '../store/GameStore';
import { sendGift } from '../api/game';
import { InventoryItem, User } from '../types';

interface GiftingData {
  item: InventoryItem;
}

/**
 * GiftingScene — модальный экран дарения.
 * Шаги: выбор получателя → превью трансформации → сообщение → анонимность → подтверждение.
 */
export class GiftingScene extends Phaser.Scene {
  private selectedUser: User | null = null;
  private isAnonymous = false;
  private messageValue = '';

  constructor() {
    super({ key: SCENE_KEYS.GIFTING });
  }

  create(data: GiftingData): void {
    const { width, height } = this.scale;
    const { item } = data;

    // Для подарка: случайный resultCatalogId (не совпадает с текущим), фиксируется при открытии
    const resultCatalogId = item.type === 'gift'
      ? this.pickRandomCatalogId(item.catalogId)
      : item.catalogId;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setInteractive();

    // Используем DOM для сложного UI формы
    const html = this.buildFormHTML(item, resultCatalogId, width, height);
    const dom = this.add.dom(width / 2, height / 2).createFromHTML(html);

    this.populateRecipients(dom, gameStore.allUsers);

    dom.addListener('click');
    dom.on('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.dataset['userId']) {
        const userId = target.dataset['userId'];
        this.selectedUser = gameStore.allUsers.find(u => u.id === userId) ?? null;
        dom.getChildByID('sendBtn')?.removeAttribute('disabled');
        (dom.getChildByID('recipientList') as HTMLElement)
          .querySelectorAll('.recipient-item')
          .forEach(el => (el as HTMLElement).style.background = '');
        target.style.background = '#2a2a60';
      }

      if (target.id === 'cancelBtn') { this.scene.stop(); return; }

      if (target.id === 'sendBtn' && this.selectedUser) {
        const msgInput = dom.getChildByID('msgInput') as HTMLInputElement;
        const anonCheck = dom.getChildByID('anonCheck') as HTMLInputElement;
        this.messageValue = msgInput.value.trim();
        this.isAnonymous = anonCheck.checked;

        try {
          target.setAttribute('disabled', 'true');
          (target as HTMLButtonElement).textContent = '...';

          await sendGift({
            instanceId: item.instanceId,
            toUserId: this.selectedUser.id,
            isAnonymous: this.isAnonymous,
            message: this.messageValue || undefined,
            resultCatalogId,
          });

          gameStore.applyGiftSent(item.instanceId);
          dom.destroy();
          this.scene.stop();
          this.showSuccessFeedback(width, height);
        } catch {
          (target as HTMLButtonElement).textContent = 'Подарить';
          target.removeAttribute('disabled');
        }
      }
    });
  }

  private pickRandomCatalogId(excludeId: string): string {
    let id: string;
    do {
      const n = Math.floor(Math.random() * CATALOG_SIZE) + 1;
      id = `gift-${n}`;
    } while (id === excludeId);
    return id;
  }

  private buildFormHTML(item: InventoryItem, resultCatalogId: string, width: number, height: number): string {
    const s = width / 390;
    const containerW = width - Math.round(48 * s);
    const pad    = Math.round(20 * s);
    const radius = Math.round(14 * s);
    const fnt16  = Math.round(16 * s);
    const fnt15  = Math.round(15 * s);
    const fnt14  = Math.round(14 * s);
    const fnt13  = Math.round(13 * s);
    const fnt11  = Math.round(11 * s);
    const gap8   = Math.round(8 * s);
    const gap12  = Math.round(12 * s);
    const chkSz  = Math.round(18 * s);
    const btnPad = Math.round(12 * s);

    const itemEntry = gameStore.getCatalogEntry(item.catalogId);
    const itemName = itemEntry?.name ?? item.catalogId;

    const transformPreview = item.type === 'gift'
      ? (() => {
          const resultEntry = gameStore.getCatalogEntry(resultCatalogId);
          const resultName = resultEntry?.name ?? resultCatalogId;
          return `<p style="color:#ffb347;font-size:${fnt13}px;margin:${gap8}px 0;text-align:center">
                    → Получатель получит: <strong>${resultName}</strong>
                  </p>`;
        })()
      : '';

    return `
      <div style="background:#1a1a36;border-radius:${radius}px;padding:${pad}px;
                  width:${containerW}px;height:${Math.round(height * 0.68)}px;overflow-y:auto">
        <p style="color:#fff;font-size:${fnt16}px;font-weight:bold;margin-bottom:${gap8}px">Ты даришь:</p>
        <div style="background:#222244;border-radius:${gap8}px;padding:${gap12}px;
                    margin-bottom:${gap8}px;display:flex;align-items:center;gap:${gap12}px">
          <span style="font-size:${fnt14}px;color:#fff">${itemName}</span>
        </div>
        ${transformPreview}

        <p style="color:#aaa;font-size:${fnt13}px;margin:${gap12}px 0 ${gap8}px">
          Выбери получателя:
        </p>
        <div id="recipientList"
             style="background:#222244;border-radius:${gap8}px;
                    max-height:${Math.round(260 * s)}px;overflow-y:auto">
        </div>

        <p style="color:#aaa;font-size:${fnt13}px;margin:${gap12}px 0 ${gap8}px">
          Сообщение (необязательно):
        </p>
        <div style="position:relative">
          <input id="msgInput" type="text" maxlength="${MESSAGE_MAX_LENGTH}"
            placeholder="Напиши что-нибудь..."
            style="width:100%;padding:${Math.round(10*s)}px;border-radius:${Math.round(6*s)}px;
                   border:none;font-size:${fnt14}px;background:#222244;color:#fff;
                   box-sizing:border-box" />
          <span id="msgCount"
                style="position:absolute;right:${gap8}px;bottom:${Math.round(10*s)}px;
                       font-size:${fnt11}px;color:#666">0/${MESSAGE_MAX_LENGTH}</span>
        </div>

        <label style="display:flex;align-items:center;gap:${gap8}px;margin:${gap12}px 0;
                      color:#fff;font-size:${fnt14}px;cursor:pointer">
          <input id="anonCheck" type="checkbox"
                 style="width:${chkSz}px;height:${chkSz}px;cursor:pointer" />
          Анонимно?
        </label>

        <div style="display:flex;gap:${gap8}px;margin-top:${Math.round(4*s)}px">
          <button id="sendBtn" disabled
            style="flex:1;background:#7b68ee;color:#fff;border:none;padding:${btnPad}px;
                   border-radius:${gap8}px;font-size:${fnt16}px;cursor:pointer;opacity:0.5">
            Подарить
          </button>
          <button id="cancelBtn"
            style="background:#333;color:#aaa;border:none;
                   padding:${btnPad}px ${Math.round(20*s)}px;
                   border-radius:${gap8}px;font-size:${fnt15}px;cursor:pointer">
            Отмена
          </button>
        </div>
      </div>
    `;
  }

  private populateRecipients(
    dom: Phaser.GameObjects.DOMElement,
    users: User[],
  ): void {
    const s = this.scale.width / 390;
    const list = dom.getChildByID('recipientList') as HTMLElement;
    const myId = gameStore.user.id;

    // Случайный порядок (из L6)
    const shuffled = [...users.filter(u => u.id !== myId)]
      .sort(() => Math.random() - 0.5);

    shuffled.forEach(u => {
      const div = document.createElement('div');
      div.className = 'recipient-item';
      div.dataset['userId'] = u.id;
      div.style.cssText =
        `padding:${Math.round(10*s)}px ${Math.round(14*s)}px;cursor:pointer;color:#fff;` +
        `font-size:${Math.round(15*s)}px;border-bottom:1px solid #333355;transition:background 0.15s`;
      div.textContent = u.name;
      list.appendChild(div);
    });

    // Счётчик символов сообщения
    const msgInput = dom.getChildByID('msgInput') as HTMLInputElement;
    const msgCount = dom.getChildByID('msgCount') as HTMLElement;

    msgInput.addEventListener('input', () => {
      msgCount.textContent = `${msgInput.value.length}/${MESSAGE_MAX_LENGTH}`;
    });
  }

  private showSuccessFeedback(w: number, h: number): void {
    const s = w / 390;
    const txt = this.add
      .text(w / 2, h / 2, 'Подарок отправлен!\nКоллега будет рад', {
        fontSize: `${Math.round(20 * s)}px`,
        color: '#4caf50',
        align: 'center',
        backgroundColor: '#000000cc',
        padding: { x: Math.round(20 * s), y: Math.round(16 * s) },
      })
      .setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      txt.destroy();
      this.scene.stop();
    });
  }
}

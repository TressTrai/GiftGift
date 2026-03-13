import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS, RADIUS, MESSAGE_MAX_LENGTH, EVENTS } from '../utils/constants';
import { EventBus } from '../utils/eventBus';
import { gameStore } from '../store/GameStore';
import { sendGift } from '../api/game';
import { InventoryItem, User } from '../types';

interface GiftingData {
  item: InventoryItem;
}

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
    const resultCatalogId = item.resultCatalogId ?? item.catalogId;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive();

    const html = this.buildFormHTML(item, resultCatalogId, width, height);
    const dom = this.add.dom(width / 2, height / 2).createFromHTML(html);

    this.populateRecipients(dom, gameStore.allUsers);

    const onTabChanged = () => this.scene.stop();
    EventBus.on(EVENTS.TAB_CHANGED, onTabChanged);
    this.events.once('shutdown', () => EventBus.off(EVENTS.TAB_CHANGED, onTabChanged));

    dom.addListener('click');
    dom.on('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.dataset['userId']) {
        const userId = target.dataset['userId'];
        this.selectedUser = gameStore.allUsers.find(u => u.id === userId) ?? null;
        const sendBtn = dom.getChildByID('sendBtn') as HTMLButtonElement;
        sendBtn.removeAttribute('disabled');
        sendBtn.style.opacity = '1';
        (dom.getChildByID('recipientList') as HTMLElement)
          .querySelectorAll('.recipient-item')
          .forEach(el => (el as HTMLElement).style.background = '');
        target.style.background = `${CSS.ACCENT_AMBER}30`;
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
          (target as HTMLElement).style.opacity = '1';
        }
      }
    });
  }

  private buildFormHTML(item: InventoryItem, resultCatalogId: string, width: number, height: number): string {
    const s = width / 390;
    const containerW = width - Math.round(48 * s);
    const pad    = Math.round(20 * s);
    const radius = Math.round(RADIUS.LG * s);
    const fLG    = Math.round(FS.LG * s);
    const fMD    = Math.round(FS.MD * s);
    const fSM    = Math.round(FS.SM * s);
    const fXS    = Math.round(FS.XS * s);
    const gap8   = Math.round(8 * s);
    const gap12  = Math.round(12 * s);
    const chkSz  = Math.round(20 * s);
    const btnPad = Math.round(13 * s);
    const inpR   = Math.round(RADIUS.SM * s);
    const ff     = 'Nunito,sans-serif';

    const itemEntry = gameStore.getCatalogEntry(item.catalogId);
    const itemName = itemEntry?.name ?? item.catalogId;

    const transformPreview = item.type === 'gift'
      ? (() => {
          const resultEntry = gameStore.getCatalogEntry(resultCatalogId);
          const resultName = resultEntry?.name ?? resultCatalogId;
          return `<p style="color:${CSS.ACCENT_AMBER};font-size:${fSM}px;margin:${gap8}px 0;
                             text-align:center;font-family:${ff}">
                    → Получатель получит: <strong>${resultName}</strong>
                  </p>`;
        })()
      : '';

    return `
      <div style="background:${CSS.BG_CARD};border-radius:${radius}px;padding:${pad}px;
                  width:${containerW}px;height:${Math.round(height * 0.72)}px;overflow-y:auto;
                  box-shadow:0 4px 32px rgba(61,43,31,0.18);font-family:${ff}">
        <p style="color:${CSS.TEXT};font-size:${fLG}px;font-weight:700;margin-bottom:${gap8}px">Ты даришь:</p>
        <div style="background:${CSS.BG_INPUT};border-radius:${inpR}px;padding:${gap12}px;
                    margin-bottom:${gap8}px;border:1.5px solid ${CSS.DIVIDER}">
          <span style="font-size:${fMD}px;color:${CSS.TEXT}">${itemName}</span>
        </div>
        ${transformPreview}

        <p style="color:${CSS.TEXT_DIM};font-size:${fSM}px;margin:${gap12}px 0 ${gap8}px">
          Выбери получателя:
        </p>
        <div id="recipientList"
             style="background:${CSS.BG_INPUT};border-radius:${inpR}px;border:1.5px solid ${CSS.DIVIDER};
                    max-height:${Math.round(210 * s)}px;overflow-y:auto">
        </div>

        <p style="color:${CSS.TEXT_DIM};font-size:${fSM}px;margin:${gap12}px 0 ${gap8}px">
          Сообщение (необязательно):
        </p>
        <div style="position:relative">
          <input id="msgInput" type="text" maxlength="${MESSAGE_MAX_LENGTH}"
            placeholder="Напиши что-нибудь..."
            style="width:100%;padding:${Math.round(11*s)}px;border-radius:${inpR}px;
                   border:1.5px solid ${CSS.DIVIDER};font-size:${fMD}px;font-family:${ff};
                   background:${CSS.BG_INPUT};color:${CSS.TEXT};
                   box-sizing:border-box;outline:none" />
          <span id="msgCount"
                style="position:absolute;right:${gap8}px;bottom:${Math.round(11*s)}px;
                       font-size:${fXS}px;color:${CSS.TEXT_DIM};font-family:${ff}">0/${MESSAGE_MAX_LENGTH}</span>
        </div>

        <label style="display:flex;align-items:center;gap:${gap8}px;margin:${gap12}px 0;
                      color:${CSS.TEXT};font-size:${fMD}px;cursor:pointer">
          <input id="anonCheck" type="checkbox"
                 style="width:${chkSz}px;height:${chkSz}px;cursor:pointer;accent-color:${CSS.ACCENT_CORAL}" />
          Анонимно?
        </label>

        <div style="display:flex;gap:${gap8}px;margin-top:${Math.round(4*s)}px">
          <button id="sendBtn" disabled
            style="flex:1;background:${CSS.BUTTON_PRIMARY};color:${CSS.TEXT_LIGHT};border:none;
                   padding:${btnPad}px;border-radius:${inpR}px;font-size:${fLG}px;font-family:${ff};
                   cursor:pointer;opacity:0.5;font-weight:700">
            Подарить
          </button>
          <button id="cancelBtn"
            style="background:${CSS.DIVIDER};color:${CSS.TEXT};border:none;
                   padding:${btnPad}px ${Math.round(22*s)}px;
                   border-radius:${inpR}px;font-size:${fMD}px;font-family:${ff};cursor:pointer">
            Отмена
          </button>
        </div>
      </div>
    `;
  }

  private populateRecipients(dom: Phaser.GameObjects.DOMElement, users: User[]): void {
    const s = this.scale.width / 390;
    const list = dom.getChildByID('recipientList') as HTMLElement;
    const myId = gameStore.user.id;

    const shuffled = [...users.filter(u => u.id !== myId)]
      .sort(() => Math.random() - 0.5);

    shuffled.forEach(u => {
      const div = document.createElement('div');
      div.className = 'recipient-item';
      div.dataset['userId'] = u.id;
      div.style.cssText =
        `padding:${Math.round(11*s)}px ${Math.round(14*s)}px;cursor:pointer;color:${CSS.TEXT};` +
        `font-size:${Math.round(FS.MD * s)}px;font-family:Nunito,sans-serif;` +
        `border-bottom:1px solid ${CSS.DIVIDER};transition:background 0.15s`;
      div.textContent = u.name;
      list.appendChild(div);
    });

    const msgInput = dom.getChildByID('msgInput') as HTMLInputElement;
    const msgCount = dom.getChildByID('msgCount') as HTMLElement;
    msgInput.addEventListener('input', () => {
      msgCount.textContent = `${msgInput.value.length}/${MESSAGE_MAX_LENGTH}`;
    });
  }

  private showSuccessFeedback(w: number, h: number): void {
    const s = w / 390;
    const r = Math.round(RADIUS.MD * s);
    const txtW = Math.round(270 * s);
    const txtH = Math.round(88 * s);

    const gfx = this.add.graphics();
    gfx.fillStyle(COLORS.BG_CARD);
    gfx.fillRoundedRect(w / 2 - txtW / 2, h / 2 - txtH / 2, txtW, txtH, r);

    this.add
      .text(w / 2, h / 2, 'Подарок отправлен!\nКоллега будет рад', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.LG * s)}px`,
        color: CSS.SUCCESS,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      gfx.destroy();
      this.scene.stop();
    });
  }
}

import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, PASSWORD_MIN_LENGTH } from '../utils/constants';
import { updateName, updatePassword } from '../api/auth';
import { gameStore } from '../store/GameStore';
import { isSoundEnabled, setSoundEnabled } from '../utils/storage';

/**
 * ProfileScene — Tab 3: Профиль.
 * Имя игрока, изменение имени/пароля, звук вкл/выкл, повторный туториал.
 */
export class ProfileScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PROFILE });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);

    this.add
      .text(cx, 20, 'Профиль', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    // Имя игрока
    this.add
      .text(cx, 100, gameStore.user.name, {
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffb347',
      })
      .setOrigin(0.5);

    this.createButton(cx, 160, 'Изменить имя', () => this.openChangeName());
    this.createButton(cx, 220, 'Изменить пароль', () => this.openChangePassword());

    // Разделитель
    this.add.line(cx, 264, 0, 0, width - 64, 0, 0x333355).setOrigin(0.5);

    this.createButton(cx, 296, 'Как играть', () => {
      this.scene.start(SCENE_KEYS.TUTORIAL);
    });

    // Переключатель звука
    const soundOn = isSoundEnabled();
    const soundLabel = this.add
      .text(cx, 356, `Звуки: ${soundOn ? 'ВКЛ' : 'ВЫКЛ'}`, {
        fontSize: '16px',
        color: soundOn ? '#4caf50' : '#888888',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    soundLabel.on('pointerup', () => {
      const current = isSoundEnabled();
      setSoundEnabled(!current);
      soundLabel.setText(`Звуки: ${!current ? 'ВКЛ' : 'ВЫКЛ'}`);
      soundLabel.setColor(!current ? '#4caf50' : '#888888');
    });
  }

  private createButton(x: number, y: number, label: string, cb: () => void): void {
    const bg = this.add
      .rectangle(x, y, 260, 44, 0x222240)
      .setStrokeStyle(1, 0x444466)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x2a2a50));
    bg.on('pointerout', () => bg.setFillStyle(0x222240));
    bg.on('pointerup', cb);
  }

  private openChangeName(): void {
    const dom = this.add.dom(this.scale.width / 2, this.scale.height / 2).createFromHTML(`
      <div style="background:#1e1e36;padding:24px;border-radius:12px;width:280px;text-align:center">
        <p style="color:#fff;margin-bottom:12px">Новое имя:</p>
        <input id="nameInput" type="text" maxlength="30"
          style="width:100%;padding:10px;border-radius:6px;border:none;font-size:16px;
                 background:#2a2a4e;color:#fff;text-align:center" />
        <br/><br/>
        <button id="saveBtn"
          style="background:#7b68ee;color:#fff;border:none;padding:10px 24px;
                 border-radius:6px;font-size:15px;cursor:pointer">
          Сохранить
        </button>
        <button id="cancelBtn"
          style="background:#333;color:#aaa;border:none;padding:10px 24px;
                 border-radius:6px;font-size:15px;cursor:pointer;margin-left:8px">
          Отмена
        </button>
      </div>
    `);

    dom.addListener('click');
    dom.on('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.id === 'cancelBtn') { dom.destroy(); return; }
      if (target.id === 'saveBtn') {
        const input = dom.getChildByID('nameInput') as HTMLInputElement;
        const name = input.value.trim();
        if (!name) return;
        await updateName(name).catch(() => {});
        gameStore.get().user.name = name;
        dom.destroy();
        this.scene.restart();
      }
    });
  }

  private openChangePassword(): void {
    const dom = this.add.dom(this.scale.width / 2, this.scale.height / 2).createFromHTML(`
      <div style="background:#1e1e36;padding:24px;border-radius:12px;width:280px;text-align:center">
        <p style="color:#fff;margin-bottom:8px">Старый пароль:</p>
        <input id="oldPwd" type="password" maxlength="50"
          style="width:100%;padding:10px;border-radius:6px;border:none;font-size:16px;
                 background:#2a2a4e;color:#fff;text-align:center" />
        <p style="color:#fff;margin:8px 0">Новый пароль (мин. ${PASSWORD_MIN_LENGTH}):</p>
        <input id="newPwd" type="password" maxlength="50"
          style="width:100%;padding:10px;border-radius:6px;border:none;font-size:16px;
                 background:#2a2a4e;color:#fff;text-align:center" />
        <p id="errMsg" style="color:#ff6b6b;font-size:13px;margin:6px 0;min-height:18px"></p>
        <button id="saveBtn"
          style="background:#7b68ee;color:#fff;border:none;padding:10px 24px;
                 border-radius:6px;font-size:15px;cursor:pointer">
          Сохранить
        </button>
        <button id="cancelBtn"
          style="background:#333;color:#aaa;border:none;padding:10px 24px;
                 border-radius:6px;font-size:15px;cursor:pointer;margin-left:8px">
          Отмена
        </button>
      </div>
    `);

    dom.addListener('click');
    dom.on('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.id === 'cancelBtn') { dom.destroy(); return; }
      if (target.id === 'saveBtn') {
        const oldPwd = (dom.getChildByID('oldPwd') as HTMLInputElement).value;
        const newPwd = (dom.getChildByID('newPwd') as HTMLInputElement).value;
        const err = dom.getChildByID('errMsg') as HTMLElement;
        if (newPwd.length < PASSWORD_MIN_LENGTH) {
          err.textContent = `Минимум ${PASSWORD_MIN_LENGTH} символа`;
          return;
        }
        await updatePassword(oldPwd, newPwd).catch(ex => { err.textContent = ex.message; });
        dom.destroy();
      }
    });
  }
}

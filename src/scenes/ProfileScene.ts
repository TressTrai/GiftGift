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
    const s = width / 390;

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);

    this.add
      .text(cx, Math.round(20 * s), 'Профиль', {
        fontSize: `${Math.round(20 * s)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    // Имя игрока
    this.add
      .text(cx, Math.round(100 * s), gameStore.user.name, {
        fontSize: `${Math.round(24 * s)}px`,
        fontStyle: 'bold',
        color: '#ffb347',
      })
      .setOrigin(0.5);

    this.createButton(cx, Math.round(170 * s), Math.round(260 * s), Math.round(44 * s), s,
      'Изменить имя', () => this.openChangeName(s));
    this.createButton(cx, Math.round(240 * s), Math.round(260 * s), Math.round(44 * s), s,
      'Изменить пароль', () => this.openChangePassword(s));

    // Разделитель
    this.add.line(cx, Math.round(296 * s), 0, 0, width - Math.round(64 * s), 0, 0x333355).setOrigin(0.5);

    this.createButton(cx, Math.round(330 * s), Math.round(260 * s), Math.round(44 * s), s,
      'Как играть', () => {
        this.scene.start(SCENE_KEYS.TUTORIAL);
      });

    // Переключатель звука
    const soundOn = isSoundEnabled();
    const soundLabel = this.add
      .text(cx, Math.round(400 * s), `Звуки: ${soundOn ? 'ВКЛ' : 'ВЫКЛ'}`, {
        fontSize: `${Math.round(16 * s)}px`,
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

  private createButton(
    x: number, y: number, w: number, h: number, s: number,
    label: string, cb: () => void,
  ): void {
    const bg = this.add
      .rectangle(x, y, w, h, 0x222240)
      .setStrokeStyle(1, 0x444466)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, {
      fontSize: `${Math.round(16 * s)}px`,
      color: '#ffffff',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x2a2a50));
    bg.on('pointerout', () => bg.setFillStyle(0x222240));
    bg.on('pointerup', cb);
  }

  private openChangeName(s: number): void {
    const formW = Math.round(280 * s);
    const pad   = Math.round(24 * s);
    const fnt   = Math.round(16 * s);
    const bfnt  = Math.round(15 * s);

    const dom = this.add.dom(this.scale.width / 2, this.scale.height / 2).createFromHTML(`
      <div style="background:#1e1e36;padding:${pad}px;border-radius:${Math.round(12*s)}px;
                  width:${formW}px;text-align:center">
        <p style="color:#fff;margin-bottom:${Math.round(12*s)}px;font-size:${fnt}px">Новое имя:</p>
        <input id="nameInput" type="text" maxlength="30"
          style="width:100%;padding:${Math.round(10*s)}px;border-radius:${Math.round(6*s)}px;
                 border:none;font-size:${fnt}px;background:#2a2a4e;color:#fff;text-align:center;
                 box-sizing:border-box" />
        <br/><br/>
        <button id="saveBtn"
          style="background:#7b68ee;color:#fff;border:none;padding:${Math.round(10*s)}px ${Math.round(24*s)}px;
                 border-radius:${Math.round(6*s)}px;font-size:${bfnt}px;cursor:pointer">
          Сохранить
        </button>
        <button id="cancelBtn"
          style="background:#333;color:#aaa;border:none;padding:${Math.round(10*s)}px ${Math.round(24*s)}px;
                 border-radius:${Math.round(6*s)}px;font-size:${bfnt}px;cursor:pointer;
                 margin-left:${Math.round(8*s)}px">
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

  private openChangePassword(s: number): void {
    const formW = Math.round(280 * s);
    const pad   = Math.round(24 * s);
    const fnt   = Math.round(16 * s);
    const bfnt  = Math.round(15 * s);
    const efnt  = Math.round(13 * s);

    const dom = this.add.dom(this.scale.width / 2, this.scale.height / 2).createFromHTML(`
      <div style="background:#1e1e36;padding:${pad}px;border-radius:${Math.round(12*s)}px;
                  width:${formW}px;text-align:center">
        <p style="color:#fff;margin-bottom:${Math.round(8*s)}px;font-size:${fnt}px">Старый пароль:</p>
        <input id="oldPwd" type="password" maxlength="50"
          style="width:100%;padding:${Math.round(10*s)}px;border-radius:${Math.round(6*s)}px;
                 border:none;font-size:${fnt}px;background:#2a2a4e;color:#fff;text-align:center;
                 box-sizing:border-box" />
        <p style="color:#fff;margin:${Math.round(8*s)}px 0;font-size:${fnt}px">
          Новый пароль (мин. ${PASSWORD_MIN_LENGTH}):
        </p>
        <input id="newPwd" type="password" maxlength="50"
          style="width:100%;padding:${Math.round(10*s)}px;border-radius:${Math.round(6*s)}px;
                 border:none;font-size:${fnt}px;background:#2a2a4e;color:#fff;text-align:center;
                 box-sizing:border-box" />
        <p id="errMsg" style="color:#ff6b6b;font-size:${efnt}px;margin:${Math.round(6*s)}px 0;
                               min-height:${Math.round(18*s)}px"></p>
        <button id="saveBtn"
          style="background:#7b68ee;color:#fff;border:none;padding:${Math.round(10*s)}px ${Math.round(24*s)}px;
                 border-radius:${Math.round(6*s)}px;font-size:${bfnt}px;cursor:pointer">
          Сохранить
        </button>
        <button id="cancelBtn"
          style="background:#333;color:#aaa;border:none;padding:${Math.round(10*s)}px ${Math.round(24*s)}px;
                 border-radius:${Math.round(6*s)}px;font-size:${bfnt}px;cursor:pointer;
                 margin-left:${Math.round(8*s)}px">
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

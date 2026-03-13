import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS, RADIUS, PASSWORD_MIN_LENGTH } from '../utils/constants';
import { saveToken, isTutorialSeen } from '../utils/storage';
import { login, register } from '../api/auth';
import { fetchState } from '../api/game';
import { gameStore } from '../store/GameStore';

export class AuthScene extends Phaser.Scene {
  private isLoginMode = true;
  private errorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.AUTH });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const s = width / 390;

    const inputW = Math.round(270 * s);
    const inputP = Math.round(13 * s);
    const inputR = Math.round(RADIUS.SM * s);
    const inputF = Math.round(FS.MD * s);

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);

    this.add
      .text(cx, height * 0.15, 'Февромарт', {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XXXL * s)}px`,
        fontStyle: 'bold',
        color: CSS.ACCENT_AMBER,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, height * 0.23, 'Игра дарения подарков', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.MD * s)}px`,
        color: CSS.TEXT_DIM,
      })
      .setOrigin(0.5);

    const nameInput = this.add
      .dom(cx, height * 0.38)
      .createFromHTML(
        `<input type="text" placeholder="Твоё имя" maxlength="30" ` +
        `style="width:${inputW}px;padding:${inputP}px;border-radius:${inputR}px;` +
        `border:1.5px solid ${CSS.DIVIDER};font-size:${inputF}px;font-family:Nunito,sans-serif;` +
        `text-align:center;background:${CSS.BG_INPUT};color:${CSS.TEXT};outline:none;" />`,
      );

    const passwordInput = this.add
      .dom(cx, height * 0.49)
      .createFromHTML(
        `<input type="password" placeholder="Пароль" maxlength="50" ` +
        `style="width:${inputW}px;padding:${inputP}px;border-radius:${inputR}px;` +
        `border:1.5px solid ${CSS.DIVIDER};font-size:${inputF}px;font-family:Nunito,sans-serif;` +
        `text-align:center;background:${CSS.BG_INPUT};color:${CSS.TEXT};outline:none;" />`,
      );

    const btnW = Math.round(270 * s);
    const btnH = Math.round(52 * s);
    const btnR = Math.round(RADIUS.MD * s);

    const btnGfx = this.add.graphics();
    btnGfx.fillStyle(COLORS.BUTTON_PRIMARY);
    btnGfx.fillRoundedRect(cx - btnW / 2, height * 0.61 - btnH / 2, btnW, btnH, btnR);
    btnGfx.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(cx - btnW / 2, height * 0.61 - btnH / 2, btnW, btnH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    const btnText = this.add
      .text(cx, height * 0.61, 'Войти', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.LG * s)}px`,
        color: CSS.TEXT_LIGHT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.errorText = this.add
      .text(cx, height * 0.70, '', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.SM * s)}px`,
        color: CSS.ERROR,
      })
      .setOrigin(0.5);

    const modeText = this.add
      .text(cx, height * 0.77, 'Нет аккаунта? Зарегистрироваться', {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.SM * s)}px`,
        color: CSS.ACCENT_TEAL,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    modeText.on('pointerup', () => {
      this.isLoginMode = !this.isLoginMode;
      btnText.setText(this.isLoginMode ? 'Войти' : 'Зарегистрироваться');
      modeText.setText(
        this.isLoginMode
          ? 'Нет аккаунта? Зарегистрироваться'
          : 'Уже есть аккаунт? Войти',
      );
    });

    btnGfx.on('pointerup', async () => {
      const name = (nameInput.node.querySelector('input') as HTMLInputElement).value.trim();
      const password = (passwordInput.node.querySelector('input') as HTMLInputElement).value;

      if (!name || !password) { this.showError('Заполни все поля'); return; }
      if (password.length < PASSWORD_MIN_LENGTH) {
        this.showError(`Пароль минимум ${PASSWORD_MIN_LENGTH} символа`); return;
      }

      btnGfx.disableInteractive();
      btnText.setText('...');

      try {
        const session = this.isLoginMode
          ? await login(name, password)
          : await register(name, password);

        saveToken(session.token);
        const state = await fetchState();
        gameStore.init(state);

        const nextScene = isTutorialSeen() ? SCENE_KEYS.GAME : SCENE_KEYS.TUTORIAL;
        this.scene.start(nextScene);
        if (nextScene === SCENE_KEYS.GAME) this.scene.start(SCENE_KEYS.UI);
      } catch (e) {
        this.showError((e as Error).message);
        btnGfx.setInteractive({
          hitArea: new Phaser.Geom.Rectangle(cx - btnW / 2, height * 0.61 - btnH / 2, btnW, btnH),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true,
        });
        btnText.setText(this.isLoginMode ? 'Войти' : 'Зарегистрироваться');
      }
    });
  }

  private showError(msg: string): void {
    this.errorText.setText(msg);
    this.time.delayedCall(3000, () => this.errorText.setText(''));
  }
}

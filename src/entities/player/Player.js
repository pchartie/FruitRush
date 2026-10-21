import Phaser from 'phaser';
import { CONFIG } from '../../config.js';
import { Sfx } from '../../audio/Sfx.js';

const JustDown = Phaser.Input.Keyboard.JustDown;
const MAX_JUMPS = 2;

// Une action = plusieurs touches possibles (principale + secondaire).
const anyDown = (keys) => keys.some((k) => k.isDown);
const anyJustDown = (keys) => keys.some((k) => JustDown(k));

export class Player {
  constructor(scene, x, y, charName = 'virtual_guy') {
    this.scene = scene;
    this.char = charName;
    this.currentAnim = '';
    this.jumpsRemaining = MAX_JUMPS;
    this.djAnimActive = false;

    const idleKey = `${charName}_idle`;
    const usePng = scene.textures.exists(idleKey);

    if (!usePng) {
      // Fallback : texture générée si les PNG manquent.
      const fbKey = `${charName}_fallback`;
      if (!scene.textures.exists(fbKey)) {
        const g = scene.make.graphics({ add: false });
        g.fillStyle(0x3498db); g.fillRect(4, 8, 24, 20);
        g.fillStyle(0xf5cba7); g.fillRect(8, 0, 16, 12);
        g.fillStyle(0x000000); g.fillRect(12, 4, 3, 3); g.fillRect(19, 4, 3, 3);
        g.fillStyle(0x2c3e50); g.fillRect(6, 26, 8, 6); g.fillRect(18, 26, 8, 6);
        g.generateTexture(fbKey, 32, 32);
        g.destroy();
      }
      this.sprite = scene.physics.add.sprite(x, y, fbKey);
      this.currentAnim = 'fallback';
    } else {
      this.sprite = scene.physics.add.sprite(x, y, idleKey, 0);
      this.sprite.play(idleKey, true);
      this.currentAnim = idleKey;
    }

    this.sprite.setCollideWorldBounds(false);
    this.sprite.setScale(1.75);
    this.sprite.body.setSize(20, 28);
    this.sprite.body.setOffset(6, 4);
    this.sprite.setDepth(10);
  }

  // keymap : { left: [Key,...], right: [Key,...], jump: [Key,...] }
  update(keymap) {
    if (!this.sprite || !this.sprite.active) return;

    const body = this.sprite.body;
    // Seul un vrai appui compte (sol, plateforme, caisse : tous statiques → blocked).
    // `touching.down` est aussi levé par un simple overlap (fruit, pointes, feu…),
    // ce qui rendait le double saut en plein vol en touchant un fruit.
    const onGround = body.blocked.down;
    const velX = Math.abs(body.velocity.x);
    const velY = body.velocity.y;

    // Reset des sauts dès qu'on touche le sol.
    if (onGround) {
      this.jumpsRemaining = MAX_JUMPS;
      this.djAnimActive = false;
    }

    // Mouvement horizontal.
    if (anyDown(keymap.left)) {
      this.sprite.setVelocityX(-CONFIG.player.speed);
      this.sprite.setFlipX(true);
    } else if (anyDown(keymap.right)) {
      this.sprite.setVelocityX(CONFIG.player.speed);
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setVelocityX(0);
    }

    // Saut : on détecte le front montant (JustDown) — pas isDown — pour autoriser
    // un 2e saut en l'air sans qu'une touche maintenue ne le déclenche tout seul.
    const jumpPressed = anyJustDown(keymap.jump);

    if (jumpPressed && this.jumpsRemaining > 0) {
      this.sprite.setVelocityY(CONFIG.player.jumpVelocity);
      this.jumpsRemaining--;
      // Dernier saut dispo consommé en l'air = double jump → on joue l'anim dédiée.
      if (this.jumpsRemaining === 0 && !onGround) {
        Sfx.doubleJump();
        const djKey = `${this.char}_dj`;
        if (this.scene.anims.exists(djKey)) {
          this.djAnimActive = true;
          this.sprite.play(djKey, true);
          this.currentAnim = djKey;
        }
      } else {
        Sfx.jump();
      }
    }

    if (this.currentAnim === 'fallback') return;

    // Choix de l'anim cible. Si le double-jump tourne encore, on le laisse finir.
    if (this.djAnimActive) {
      const djKey = `${this.char}_dj`;
      const playing = this.sprite.anims.isPlaying && this.sprite.anims.currentAnim?.key === djKey;
      if (playing) return;
      this.djAnimActive = false;
    }

    let desired;
    if (!onGround) {
      desired = velY < -50 ? `${this.char}_jump` : `${this.char}_fall`;
    } else if (velX > 10) {
      desired = `${this.char}_run`;
    } else {
      desired = `${this.char}_idle`;
    }

    if (desired !== this.currentAnim && this.scene.anims.exists(desired)) {
      this.currentAnim = desired;
      this.sprite.play(desired, true);
    }
  }
}

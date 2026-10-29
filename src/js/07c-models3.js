/* ===================== Models for the third wish list ===================== */
function buildModels3() {
  // the Golden Snitch: a little golden ball with fluttering silver wings
  defModel('snitch', 'snitch', 2 / 16, [
    { name: 'ball', box: [-1.5, 0, -1.5, 3, 3, 3], uv: [0, 0] },
    { name: 'lwing', box: [1.5, 1, -1.5, 5, 1, 3], uv: [12, 0], pivot: [1.5, 1.5, 0] },
    { name: 'rwing', box: [-6.5, 1, -1.5, 5, 1, 3], uv: [12, 0], pivot: [-1.5, 1.5, 0] },
  ]);
  // the Sorting Hat, sitting on its stool
  defModel('sorting_hat', 'sorting_hat', 1, [
    { name: 'stool', boxes: [[-5, 9, -5, 10, 2, 10, 0, 32], [-4, 0, -4, 2, 9, 2, 40, 32], [2, 0, -4, 2, 9, 2, 40, 32], [-1, 0, 2, 2, 9, 2, 40, 32]] },
    { name: 'hat', boxes: [[-7, 11, -7, 14, 1, 14, 0, 0], [-4, 12, -4, 8, 5, 8, 0, 16]], pivot: [0, 11, 0] },
    { name: 'tip', boxes: [[-2.5, 17, -3, 5, 4, 5, 32, 16], [-1.5, 21, -4, 3, 3, 3, 52, 16]], pivot: [0, 17, 0] },
  ]);
  // a floating candle
  defModel('candle', 'candle', 1, [{ name: 'c', boxes: [[-1, 0, -1, 2, 7, 2, 0, 0], [-0.5, 7, -0.5, 1, 1, 1, 8, 0], [-0.5, 8, -0.5, 1, 2, 1, 12, 0]] }]);
  // a Patronus: a stag with antlers
  const leg = (name, x, z) => ({ name, box: [x, 0, z, 2, 10, 2], uv: [52, 0], pivot: [x + 1, 10, z + 1] });
  defModel('patronus', 'patronus', 1 / 16, [
    { name: 'body', box: [-3, 10, -7, 6, 6, 14], uv: [0, 0] },
    { name: 'neck', box: [-1.5, 14, 5, 3, 6, 3], uv: [40, 0] },
    { name: 'head', boxes: [[-2, 19, 5, 4, 4, 6, 0, 20], [-3.5, 23, 6, 1, 5, 1, 20, 20], [2.5, 23, 6, 1, 5, 1, 20, 20], [-6, 26, 6, 3, 1, 1, 28, 20], [3, 26, 6, 3, 1, 1, 28, 20], [-5, 24, 6, 2, 1, 1, 28, 20], [3, 24, 6, 2, 1, 1, 28, 20]], pivot: [0, 17, 6.5] },
    { name: 'tail', box: [-1, 14, -8, 2, 2, 2], uv: [24, 26] },
    leg('fl', -3, 4), leg('fr', 1, 4), leg('bl', -3, -6), leg('br', 1, -6),
  ]);
  // the rocket: about four blocks tall, with a stepped nose, four fins and the engine underneath
  defModel('rocket', 'rocket', 2 / 16, [
    { name: 'body', boxes: [
      [-4, 6, -4, 8, 20, 8, 0, 0], [-3, 26, -3, 6, 3, 6, 32, 0], [-2, 29, -2, 4, 2, 4, 32, 10], [-1, 31, -1, 2, 2, 2, 48, 10],
      [4, 1, -0.5, 3, 8, 1, 32, 17], [-7, 1, -0.5, 3, 8, 1, 32, 17], [-0.5, 1, 4, 1, 8, 3, 40, 17], [-0.5, 1, -7, 1, 8, 3, 40, 17],
      [-3, 3, -3, 6, 3, 6, 0, 29], [-2, 0, -2, 4, 3, 4, 24, 29],
    ] },
  ]);
  // a space helmet over a player's head (like the other helmets: drawn with the player, posed with the head)
  defModel('space_helmet', 'space_helmet', 1, [{ name: 'head', box: [-4, 24, -4, 8, 8, 8], uv: [0, 0], pivot: [0, 24, 0], inflate: 1.6 }]);
  // a robot: a boxy silver head with a visor and an antenna, a body in its own colour, little arms and legs
  defModel('robot', 'robot', 1 / 16, [
    { name: 'rleg', box: [-2.5, 0, -1, 2, 4, 2], uv: [40, 12], pivot: [-1.5, 4, 0] },
    { name: 'lleg', box: [0.5, 0, -1, 2, 4, 2], uv: [48, 12], pivot: [1.5, 4, 0] },
    { name: 'body', box: [-3, 4, -2, 6, 5, 4], uv: [0, 12], tint: true },
    { name: 'rarm', box: [-5, 4, -1, 2, 5, 2], uv: [24, 12], pivot: [-4, 8.5, 0] },
    { name: 'larm', box: [3, 4, -1, 2, 5, 2], uv: [32, 12], pivot: [4, 8.5, 0] },
    { name: 'head', boxes: [[-3, 9, -3, 6, 5, 6, 0, 0], [-0.5, 14, -0.5, 1, 2, 1, 24, 0]], pivot: [0, 9, 0] },
  ]);
  defModel('robot_light', 'robot', 1 / 16, [{ name: 'head', box: [-1, 16, -1, 2, 2, 2], uv: [28, 0], pivot: [0, 9, 0], tint: true }]);   // (the ball on its antenna: coloured to show what it is doing)
  // a security camera: a white box with its lens at the front, on a little stand or on an arm out from a wall
  const camBody = (y, z) => ({ name: 'body', boxes: [[-2, y, z, 4, 4, 7, 0, 0], [-1.5, y + 0.5, z + 7, 3, 3, 1, 24, 0]], pivot: [0, y + 2, z] });
  defModel('camera_stand', 'camera', 1 / 16, [{ name: 'stand', boxes: [[-2, 0, -2, 4, 1, 4, 0, 16], [-0.5, 1, -0.5, 1, 6, 1, 20, 16]] }, camBody(7, -4)]);
  defModel('camera_wall', 'camera', 1 / 16, [{ name: 'arm', boxes: [[-1.5, 9.5, -8, 3, 3, 1, 28, 16], [-0.5, 10.5, -7, 1, 1, 4, 40, 16]] }, camBody(9, -3)]);
  // a flag on a pole (drawn on its block, see 09m-moon.js)
  defModel('flag', 'flag', 1 / 16, [
    { name: 'pole', box: [-0.5, 0, -0.5, 1, 30, 1], uv: [0, 0] },
    { name: 'cloth', boxes: [[0.5, 19.5, -0.5, 14, 9, 1, 4, 0], [0.5, 28.5, -0.5, 14, 1, 1, 4, 12]] },
  ]);
  // the flying car: the car's shape, with wings that fold up on the ground and out in the air, a fin and two jets
  defModel('flycar', 'flycar', 2 / 16, [
    { name: 'body', boxes: [
      [-5.5, 1, -9, 11, 2, 18, 0, 0],
      [-5.5, 3, -9, 1, 3, 18, 0, 20], [4.5, 3, -9, 1, 3, 18, 0, 20],
      [-4.5, 3, 3, 9, 3, 6, 0, 41], [-4.5, 3, -9, 9, 3, 5, 30, 41],
      [-4, 3, -4, 8, 1, 4, 0, 50], [-4, 4, -4, 8, 4, 1, 24, 50],
      [-4.5, 6, 2.5, 9, 3, 1, 42, 50],
      [-1, 5, 1.5, 2, 2, 1, 8, 56],
      [-4.5, 2, -10, 9, 1, 1, 14, 56],
      [-0.5, 6, -9, 1, 4, 3, 40, 29],
      [-4, 3.5, -10.5, 2, 2, 2, 48, 29], [2, 3.5, -10.5, 2, 2, 2, 48, 29],
    ] },
    { name: 'wfl', box: [-6.5, 0, 4, 1, 3, 3], uv: [0, 56], pivot: [-6, 1.5, 5.5] },
    { name: 'wfr', box: [5.5, 0, 4, 1, 3, 3], uv: [0, 56], pivot: [6, 1.5, 5.5] },
    { name: 'wbl', box: [-6.5, 0, -7, 1, 3, 3], uv: [0, 56], pivot: [-6, 1.5, -5.5] },
    { name: 'wbr', box: [5.5, 0, -7, 1, 3, 3], uv: [0, 56], pivot: [6, 1.5, -5.5] },
    { name: 'lwing', box: [5.5, 3.5, -5, 5, 1, 7], uv: [40, 20], pivot: [5.5, 4, -1.5] },
    { name: 'rwing', box: [-10.5, 3.5, -5, 5, 1, 7], uv: [40, 20], pivot: [-5.5, 4, -1.5] },
  ]);
  // a broomstick: the handle at about waist height (it hovers there), the twigs at the back
  defModel('broom', 'broom', 1 / 16, [
    { name: 'stick', boxes: [[-0.5, 11.5, -9, 1, 1, 20, 0, 0], [-0.5, 11.5, 11, 1, 1, 1, 24, 22]] },
    { name: 'twigs', boxes: [[-1.5, 10.5, -13, 3, 3, 5, 0, 22], [-2, 10, -17, 4, 4, 4, 0, 32]] },
  ]);
  // Snorks: small, with big heads and a snorkel that comes up from the back of the head and bends forward
  SNORK_COLORS.forEach((c, i) => defModel('snork_' + i, 'snork_' + i, 0.85 / 16, [
    { name: 'rleg', box: [-2.5, 0, -1, 2, 4, 2], uv: [40, 16], pivot: [-1.5, 4, 0] },
    { name: 'lleg', box: [0.5, 0, -1, 2, 4, 2], uv: [48, 16], pivot: [1.5, 4, 0] },
    { name: 'body', box: [-3.5, 4, -2.5, 7, 6, 5], uv: [0, 16] },
    { name: 'rarm', box: [-5.5, 5, -1, 2, 5, 2], uv: [24, 16], pivot: [-4.5, 10, 0] },
    { name: 'larm', box: [3.5, 5, -1, 2, 5, 2], uv: [32, 16], pivot: [4.5, 10, 0] },
    { name: 'head', box: [-4, 10, -4, 8, 7, 8], uv: [0, 0], pivot: [0, 10, 0] },
    { name: 'tube', box: [-1, 17, -3, 2, 5, 2], uv: [32, 0], pivot: [0, 10, 0], follow: 'head' },
    { name: 'tip', box: [-1, 22, -3, 2, 2, 5], uv: [44, 0], pivot: [0, 10, 0], follow: 'head' },
  ]));
  // the iron golem: twice the usual scale (each skin pixel is 1/8 of a block), about 2.6 blocks tall, with long arms
  defModel('golem', 'golem', 2 / 16, [
    { name: 'rleg', box: [-3.5, 0, -1.5, 3, 8, 3], uv: [20, 24], pivot: [-2, 8, 0] },
    { name: 'lleg', box: [0.5, 0, -1.5, 3, 8, 3], uv: [32, 24], pivot: [2, 8, 0] },
    { name: 'waist', box: [-2, 8, -1.5, 4, 3, 3], uv: [30, 10] },
    { name: 'body', box: [-4.5, 11, -3, 9, 6, 6], uv: [0, 10] },
    { name: 'head', box: [-2, 15.5, -0.5, 4, 5, 4], uv: [0, 0], pivot: [0, 16, 1] },
    { name: 'nose', box: [-0.5, 16.3, 3.5, 1, 2, 1], uv: [16, 0], pivot: [0, 16, 1], follow: 'head' },
    { name: 'rarm', box: [-6.5, 2, -1.5, 2, 15, 3], uv: [0, 24], pivot: [-5.5, 16, 0] },
    { name: 'larm', box: [4.5, 2, -1.5, 2, 15, 3], uv: [10, 24], pivot: [5.5, 16, 0] },
  ]);
}

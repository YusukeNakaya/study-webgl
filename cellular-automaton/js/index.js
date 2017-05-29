// JavaScript Document

(function($) {
  var Index = $.index = (function() {
    var
      i = 0,
      j = 0,
      k = 0,
      canvasWidth = 1200,
      canvasHeight = 650,
      cellSize = 8,
      cols = 0,
      rows = 0,
      cells = [],
      cellRGB = 'rgb(255, 200, 20)',
      rendererRGB = 'rgb(255, 200, 20)',
      startFlg = false,
      controls = null,
      scene = null,
      camera = null,
      renderer = null,
      points = null,
      pointsReverse = null,
      geometry = null,
      geometryReverse = null,

      $wrapper = null,
      $window = null;

    function init() {
      $window = $(window);
      $wrapper = $('#lifegame');

      // シーン
      scene = new THREE.Scene();

      // フォグ
      // scene.fog = new THREE.FogExp2(0x000000, 0.0015);

      // カメラ
      camera = new THREE.PerspectiveCamera(50, $window.width() / $window.height(), 0.1, 20000);
      scene.add(camera);
      camera.position.set(0, 0, 500);

      // カメラコントロール
      controls = new THREE.OrbitControls(camera);

      // セルオートマトン
      cols = Math.floor($window.width() / cellSize) * 2;
      rows = Math.floor(canvasHeight / cellSize) * 2;
      geometry = new THREE.Geometry();
      geometryReverse = new THREE.Geometry();
      for (i = 0; i < cols; i++) {
        cells[i] = [];
        for (j = 0; j < rows; j++) {
          var
            x = i * cellSize - $window.width() / 2 * 2,
            y = j * cellSize - canvasHeight,
            z = 0;
          geometry.vertices.push(new THREE.Vector3(x, y, z));
          geometryReverse.vertices.push(new THREE.Vector3(x, y + cellSize / 2, z));
          cells[i].push(geometry.vertices[geometry.vertices.length - 1]);
          cells[i][cells[i].length - 1].life = Math.round(Math.random());
          cells[i].push(geometryReverse.vertices[geometryReverse.vertices.length - 1]);
          cells[i][cells[i].length - 1].life = Math.round(Math.random());
        }
      }

      var material = new THREE.PointsMaterial({
        map: createTexture(),
        size: cellSize * 2.2,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false
      });

      var materialReverse = new THREE.PointsMaterial({
        map: createTextureReverse(),
        size: cellSize * 2.2,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false
      });

      points = new THREE.Points(geometry, material);
      points.sortParticles = true;
      scene.add(points);

      pointsReverse = new THREE.Points(geometryReverse, materialReverse);
      pointsReverse.sortParticles = true;
      scene.add(pointsReverse);

      // レンダラー
      renderer = new THREE.WebGLRenderer({antialias: true});
      renderer.setSize($window.width(), canvasHeight);
      renderer.setClearColor(new THREE.Color(rendererRGB));
      $wrapper.prepend(renderer.domElement);
      rendering();

      // windowイベント
      $window.on({
        'resize': function() {
          renderer.setSize($window.width(), $window.height());
          camera.aspect = $window.width() / $window.height();
          camera.updateProjectionMatrix();
        },
        'click touchstart': function() {
          startFlg = true;
          $window.off('click');
        }
      }).trigger('resize');
    }

    function createTexture() {
      var canvas = document.createElement('canvas');
      var size = 128;
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.fillStyle = cellRGB;
      ctx.moveTo(0, 0);
      ctx.lineTo(size, size / 2);
      ctx.lineTo(0, size);
      ctx.closePath();
      ctx.fill();

      texture = new THREE.Texture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      return texture;
    };

    function createTextureReverse() {
      var canvas = document.createElement('canvas');
      var size = 128;
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.fillStyle = cellRGB;
      ctx.moveTo(size, 0);
      ctx.lineTo(0, size / 2);
      ctx.lineTo(size, size);
      ctx.closePath();
      ctx.fill();

      texture = new THREE.Texture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      return texture;
    };

    // 周囲の生存セルを数える
    function countAround(x, y) {
      var count = 0;
      for(i = -1; i <= 1; i++) {
        for(j = -1; j <= 1; j++) {
          if((i != 0 || j != 0) && x + i >= 0 && x + i < cols && y + j >= 0 && y + j < rows * 2) {
            count += cells[x + i][y + j].life;
          }
        }
      }
      return count;
    }

    function rendering() {
      if (startFlg) {
        var tmpCells = [];
        for(col = 0; col < cols; col++) {
          tmpCells[col] = [];
          for(row = 0; row < rows * 2; row++) {
            var count = countAround(col, row);
            if(cells[col][row].life == 1){
              if(count == 2 || count == 3){
                tmpCells[col][row] = 1;
              } else {
                tmpCells[col][row] = 0;
              }
            } else {
              if(count == 3){
                tmpCells[col][row] = 1;
              } else {
                tmpCells[col][row] = 0;
              }
            }
          }
        }
        for (col = 0; col < cols; col++) {
          for (row = 0; row < rows * 2; row++) {
            if (tmpCells[col][row] == 1) {
              cells[col][row].life = 1;
              cells[col][row].z = Math.min(300, cells[col][row].z + 3);
            } else {
              cells[col][row].life = 0;
              cells[col][row].z = Math.max(0, cells[col][row].z - 1);
            }
          }
        }
      }
      controls.update();
      renderer.render(scene, camera);
      points.geometry.verticesNeedUpdate = true;
      pointsReverse.geometry.verticesNeedUpdate = true;
      requestAnimationFrame(rendering, renderer.domElement);
    }

    return {
      init: init
    }
  })();
  $(Index.init);
})(jQuery);

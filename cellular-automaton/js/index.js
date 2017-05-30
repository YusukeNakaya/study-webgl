// JavaScript Document

(function($) {
  var Index = $.index = (function() {
    var
      i = 0,
      j = 0,
      k = 0,
      windowWidth = 0,
      windowHeight = 0,
      cellSize = 8,
      moveSurvive = 3,
      moveDeath = -1,
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
      // 初期設定
      $window = $(window);
      $wrapper = $('#lifegame');
      setWindowSize();

      // シーン
      scene = new THREE.Scene();

      // フォグ
      // scene.fog = new THREE.FogExp2(0x000000, 0.0015);

      // カメラ
      camera = new THREE.PerspectiveCamera(50, windowWidth / windowHeight, 0.1, 20000);
      scene.add(camera);
      camera.position.set(0, 0, 500);

      // カメラコントロール
      controls = new THREE.OrbitControls(camera);

      // セルオートマトンの行列数
      cols = Math.floor(windowWidth / cellSize) * 2;
      rows = Math.floor(windowHeight / cellSize) * 2;

      // Geometryセットアップ（右向きと左向きの2パターン）
      geometry = new THREE.Geometry();
      geometryReverse = new THREE.Geometry();

      // 行列で二重ループ
      for (i = 0; i < cols; i++) {
        cells[i] = [];
        for (j = 0; j < rows; j++) {
          // 位置xyzを計算
          var
            x = i * cellSize - windowWidth / 2 * 2,
            y = j * cellSize - windowHeight,
            z = 0;
          // Geometryのverticesに位置を格納
          geometry.vertices.push(new THREE.Vector3(x, y, z));
          geometryReverse.vertices.push(new THREE.Vector3(x, y + cellSize / 2, z));
          // 配列にGeometryを格納しつつ、ついでに生死判定をランダム（0 or 1）でlifeに代入
          cells[i].push(geometry.vertices[geometry.vertices.length - 1]);
          cells[i][cells[i].length - 1].life = Math.round(Math.random());
          cells[i].push(geometryReverse.vertices[geometryReverse.vertices.length - 1]);
          cells[i][cells[i].length - 1].life = Math.round(Math.random());
        }
      }

      // 右向きのMaterialをセットアップ
      var material = new THREE.PointsMaterial({
        map: createTexture(),
        size: cellSize * 2.2,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false
      });
      points = new THREE.Points(geometry, material);
      points.sortParticles = true;
      scene.add(points);

      // 左向きのMaterialをセットアップ
      var materialReverse = new THREE.PointsMaterial({
        map: createTextureReverse(),
        size: cellSize * 2.2,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false
      });
      pointsReverse = new THREE.Points(geometryReverse, materialReverse);
      pointsReverse.sortParticles = true;
      scene.add(pointsReverse);

      // レンダラー
      renderer = new THREE.WebGLRenderer({antialias: true});
      renderer.setSize(windowWidth, windowHeight);
      renderer.setClearColor(new THREE.Color(rendererRGB));
      $wrapper.prepend(renderer.domElement);
      rendering();

      // windowイベント（resizeは最初にトリガーを引いておく）
      $window.on({
        // リサイズ
        'resize': function() {
          setWindowSize();
          renderer.setSize(windowWidth, windowHeight);
          camera.aspect = windowWidth / windowHeight;
          camera.updateProjectionMatrix();
        },
        // クリック（タッチスタート）イベント
        'click touchstart': function() {
          startFlg = true;
          $window.off('click');
          $window.off('touchstart');
        }
      }).trigger('resize');
    }

    // 右向きのテクスチャを返す
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

    // 左向きのテクスチャを返す
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

    // 周囲の生存セル数を返す
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

    // フレーム毎のレンダリング
    function rendering() {
      // クリック（タッチスタート）待ち
      if (startFlg) {
        var tmpCells = [];
        // 生死判定用の二次元配列を作る
        for(col = 0; col < cols; col++) {
          tmpCells[col] = [];
          for(row = 0; row < rows * 2; row++) {
            // 周囲の生存セル数を取得
            var count = countAround(col, row);
            // 生死判定
            if(cells[col][row].life == 1){
              // 直前で生きている場合
              if(count == 2 || count == 3){
                tmpCells[col][row] = 1;
              } else {
                tmpCells[col][row] = 0;
              }
            } else {
              // 直前で死んでいる場合
              if(count == 3){
                tmpCells[col][row] = 1;
              } else {
                tmpCells[col][row] = 0;
              }
            }
          }
        }
        // 生死判定用配列に従ってGeometryの状態を変更
        for (col = 0; col < cols; col++) {
          for (row = 0; row < rows * 2; row++) {
            if (tmpCells[col][row] == 1) {
              // 生きる場合の状態と位置変更
              cells[col][row].life = 1;
              cells[col][row].z = Math.min(300, cells[col][row].z + moveSurvive);
            } else {
              // 死ぬ場合の状態と位置変更
              cells[col][row].life = 0;
              cells[col][row].z = Math.max(0, cells[col][row].z + moveDeath);
            }
          }
        }
      }

      // レンダリングを繰り返すおまじない
      controls.update();
      renderer.render(scene, camera);
      points.geometry.verticesNeedUpdate = true;
      pointsReverse.geometry.verticesNeedUpdate = true;
      requestAnimationFrame(rendering, renderer.domElement);
    }

    function setWindowSize() {
      windowWidth = $window.width();
      windowHeight = $window.height();
    }

    return {
      init: init
    }
  })();
  $(Index.init);
})(jQuery);

import RVOMath from "./RVOMath";
import Simulator from "./Simulator";
import Vector2D from "./Vector2D";
import Obstacle from "./Obstacle";
import Line from "./Line";

export default class Agent {
  public id = 0;
  simulator: Simulator;
  agentNeighbors = []; //  new List<KeyValuePair<float, Agent>>()
  maxNeighbors = 0;
  maxSpeed = 0.0;
  neighborDist = 0.0;
  private _newVelocity: Vector2D;
  obstaclNeighbors: KeyValuePair[] = []; // new List<KeyValuePair<float, Obstacle>>()
  orcaLines: Line[] = [];
  position: Vector2D;

  prefVelocity: Vector2D;

  radius = 0.0;
  timeHorizon = 0.0;
  timeHorizonObst = 0.0;
  velocity: Vector2D;

  // 临时向量池，避免频繁创建对象（性能优化关键）
  private _temp1 = new Vector2D();
  private _temp2 = new Vector2D();
  private _temp3 = new Vector2D();
  private _temp4 = new Vector2D();
  private _temp5 = new Vector2D();
  private _temp6 = new Vector2D();
  private _temp7 = new Vector2D();
  private _temp8 = new Vector2D();

  computeNeighbors() {
    this.obstaclNeighbors = [];
    var rangeSq = RVOMath.sqr(this.timeHorizonObst * this.maxSpeed + this.radius);
    this.simulator.kdTree.computeObstacleNeighbors(this, rangeSq);

    this.agentNeighbors = [];
    if (this.maxNeighbors > 0) {
      rangeSq = RVOMath.sqr(this.neighborDist);
      this.simulator.kdTree.computeAgentNeighbors(this, rangeSq);
    }
  }

  /* Search for the best new velocity. */
  computeNewVelocity() {
    this.orcaLines.length = 0;
    let orcaLines = this.orcaLines;
    const invTimeHorizonObst = 1.0 / this.timeHorizonObst;

    /* Create obstacle ORCA lines. */
    for (var i = 0; i < this.obstaclNeighbors.length; ++i) {
      let obstacle1: Obstacle = this.obstaclNeighbors[i].value;
      let obstacle2 = obstacle1.next;

      // 使用临时向量避免创建新对象
      this._temp1.copy(obstacle1.point).subSelf(this.position);  // relativePosition1
      this._temp2.copy(obstacle2.point).subSelf(this.position);  // relativePosition2
      let relativePosition1 = this._temp1;
      let relativePosition2 = this._temp2;

      /*
       * Check if velocity obstacle of obstacle is already taken care of by
       * previously constructed obstacle ORCA lines.
       */
      let alreadyCovered = false

      for (var j = 0; j < orcaLines.length; ++j) {
        // 使用临时向量优化，避免创建新对象
        this._temp3.copy(relativePosition1).scaleSelf(invTimeHorizonObst).subSelf(orcaLines[j].point);
        this._temp4.copy(relativePosition2).scaleSelf(invTimeHorizonObst).subSelf(orcaLines[j].point);
        if (RVOMath.det(this._temp3, orcaLines[j].direction) - invTimeHorizonObst * this.radius >= -RVOMath.RVO_EPSILON && 
            RVOMath.det(this._temp4, orcaLines[j].direction) - invTimeHorizonObst * this.radius >= -RVOMath.RVO_EPSILON) {
          alreadyCovered = true
          break
        }
      }

      if (alreadyCovered) {
        continue
      }

      /* Not yet covered. Check for collisions. */

      let distSq1 = RVOMath.absSq(relativePosition1)
      let distSq2 = RVOMath.absSq(relativePosition2)

      let radiusSq = RVOMath.sqr(this.radius)

      // 使用临时向量优化
      this._temp3.copy(obstacle2.point).subSelf(obstacle1.point);  // obstacleVector
      let obstacleVector = this._temp3;
      
      this._temp4.copy(relativePosition1).scaleSelf(-1);  // -relativePosition1
      let s = this._temp4.multiply(obstacleVector) / RVOMath.absSq(obstacleVector);
      
      this._temp5.copy(obstacleVector).scaleSelf(s);
      this._temp4.copy(relativePosition1).scaleSelf(-1).subSelf(this._temp5);
      let distSqLine = RVOMath.absSq(this._temp4);

      var line = new Line();

      if (s < 0 && distSq1 <= radiusSq) {
        /* Collision with left vertex. Ignore if non-convex. */
        if (obstacle1.isConvex) {
          line.point = new Vector2D(0, 0);
          this._temp6.set(-relativePosition1.y, relativePosition1.x);
          line.direction = RVOMath.normalize(this._temp6);
          orcaLines.push(line)
        }
        continue
      } else if (s > 1 && distSq2 <= radiusSq) {
        /* Collision with right vertex. Ignore if non-convex
         * or if it will be taken care of by neighoring obstace */
        if (obstacle2.isConvex && RVOMath.det(relativePosition2, obstacle2.unitDir) >= 0) {
          line.point = new Vector2D(0, 0);
          this._temp6.set(-relativePosition2.y, relativePosition2.x);
          line.direction = RVOMath.normalize(this._temp6);
          orcaLines.push(line)
        }
        continue
      } else if (s >= 0 && s < 1 && distSqLine <= radiusSq) {
        /* Collision with obstacle segment. */
        line.point = new Vector2D(0, 0);
        line.direction = obstacle1.unitDir.scale(-1);
        orcaLines.push(line)
        continue
      }

      /*
       * No collision.
       * Compute legs. When obliquely viewed, both legs can come from a single
       * vertex. Legs extend cut-off line when nonconvex vertex.
       */

      var leftLegDirection, rightLegDirection

      if (s < 0 && distSqLine <= radiusSq) {
        /*
         * Obstacle viewed obliquely so that left vertex
         * defines velocity obstacle.
         */
        if (!obstacle1.isConvex) {
          /* Ignore obstacle. */
          continue
        }

        obstacle2 = obstacle1

        let leg1 = Math.sqrt(distSq1 - radiusSq)
        // 使用临时向量优化
        this._temp6.set(
          relativePosition1.x * leg1 - relativePosition1.y * this.radius, 
          relativePosition1.x * this.radius + relativePosition1.y * leg1
        );
        leftLegDirection = this._temp6.scale(1 / distSq1);
        
        this._temp7.set(
          relativePosition1.x * leg1 + relativePosition1.y * this.radius, 
          -relativePosition1.x * this.radius + relativePosition1.y * leg1
        );
        rightLegDirection = this._temp7.scale(1 / distSq1);
      } else if (s > 1 && distSqLine <= radiusSq) {
        /*
         * Obstacle viewed obliquely so that
         * right vertex defines velocity obstacle.
         */
        if (!obstacle2.isConvex) {
          /* Ignore obstacle. */
          continue
        }

        obstacle1 = obstacle2

        let leg2 = Math.sqrt(distSq2 - radiusSq)
        // 使用临时向量优化
        this._temp6.set(
          relativePosition2.x * leg2 - relativePosition2.y * this.radius, 
          relativePosition2.x * this.radius + relativePosition2.y * leg2
        );
        leftLegDirection = this._temp6.scale(1 / distSq2);
        
        this._temp7.set(
          relativePosition2.x * leg2 + relativePosition2.y * this.radius, 
          -relativePosition2.x * this.radius + relativePosition2.y * leg2
        );
        rightLegDirection = this._temp7.scale(1 / distSq2);
      } else {
        /* Usual situation. */
        if (obstacle1.isConvex) {
          let leg1 = Math.sqrt(distSq1 - radiusSq)
          // 使用临时向量优化
          this._temp6.set(
            relativePosition1.x * leg1 - relativePosition1.y * this.radius, 
            relativePosition1.x * this.radius + relativePosition1.y * leg1
          );
          leftLegDirection = this._temp6.scale(1 / distSq1);
        } else {
          /* Left vertex non-convex; left leg extends cut-off line. */
          leftLegDirection = obstacle1.unitDir.scale(-1)
        }

        if (obstacle2.isConvex) {
          let leg2 = Math.sqrt(distSq2 - radiusSq)
          // 使用临时向量优化
          this._temp7.set(
            relativePosition2.x * leg2 + relativePosition2.y * this.radius, 
            -relativePosition2.x * this.radius + relativePosition2.y * leg2
          );
          rightLegDirection = this._temp7.scale(1 / distSq2);
        } else {
          /* Right vertex non-convex; right leg extends cut-off line. */
          rightLegDirection = obstacle1.unitDir
        }
      }

      /*
       * Legs can never point into neighboring edge when convex vertex,
       * take cutoff-line of neighboring edge instead. If velocity projected on
       * "foreign" leg, no constraint is added.
       */

      let leftNeighbor = obstacle1.previous;

      let isLeftLegForeign = false;
      let isRightLegForeign = false;

      if (obstacle1.isConvex && RVOMath.det(leftLegDirection, leftNeighbor.unitDir.scale(-1)) >= 0.0) {
        /* Left leg points into obstacle. */
        leftLegDirection = leftNeighbor.unitDir.scale(-1)
        isLeftLegForeign = true
      }

      if (obstacle2.isConvex && RVOMath.det(rightLegDirection, obstacle2.unitDir) <= 0.0) {
        /* Right leg points into obstacle. */
        rightLegDirection = obstacle2.unitDir
        isRightLegForeign = true
      }

      /* Compute cut-off centers. */
      // 使用临时向量优化
      this._temp6.copy(obstacle1.point).subSelf(this.position).scaleSelf(invTimeHorizonObst);  // leftCutoff
      this._temp7.copy(obstacle2.point).subSelf(this.position).scaleSelf(invTimeHorizonObst);  // rightCutoff
      let leftCutoff = this._temp6;
      let rightCutoff = this._temp7;
      
      this._temp8.copy(rightCutoff).subSelf(leftCutoff);  // cutoffVec
      let cutoffVec = this._temp8;

      /* Project current velocity on velocity obstacle. */

      /* Check if current velocity is projected on cutoff circles. */
      let t = obstacle1 == obstacle2 ? 0.5 : (this._temp4.copy(this.velocity).subSelf(leftCutoff).multiply(cutoffVec) / RVOMath.absSq(cutoffVec));
      let tLeft = (this._temp5.copy(this.velocity).subSelf(leftCutoff).multiply(leftLegDirection));
      let tRight = (this._temp4.copy(this.velocity).subSelf(rightCutoff).multiply(rightLegDirection));

      if ((t < 0.0 && tLeft < 0.0) || (obstacle1 == obstacle2 && tLeft < 0.0 && tRight < 0.0)) {
        /* Project on left cut-off circle. */
        this._temp4.copy(this.velocity).subSelf(leftCutoff);
        let unitW = RVOMath.normalize(this._temp4);

        line.direction = new Vector2D(unitW.y, -unitW.x);
        this._temp5.copy(unitW).scaleSelf(this.radius * invTimeHorizonObst);
        line.point = leftCutoff.plus(this._temp5);
        orcaLines.push(line)
        continue
      } else if (t > 1.0 && tRight < 0.0) {
        /* Project on right cut-off circle. */
        this._temp4.copy(this.velocity).subSelf(rightCutoff);
        let unitW = RVOMath.normalize(this._temp4);

        line.direction = new Vector2D(unitW.y, -unitW.x);
        this._temp5.copy(unitW).scaleSelf(this.radius * invTimeHorizonObst);
        line.point = rightCutoff.plus(this._temp5);
        orcaLines.push(line)
        continue
      }

      /*
       * Project on left leg, right leg, or cut-off line, whichever is closest
       * to velocity.
       */
      let distSqCutoff, distSqLeft, distSqRight;
      if (t < 0.0 || t > 1.0 || obstacle1 == obstacle2) {
        distSqCutoff = Infinity;
      } else {
        this._temp4.copy(cutoffVec).scaleSelf(t).addSelf(leftCutoff);
        this._temp5.copy(this.velocity).subSelf(this._temp4);
        distSqCutoff = RVOMath.absSq(this._temp5);
      }
      
      if (tLeft < 0.0) {
        distSqLeft = Infinity;
      } else {
        this._temp4.copy(leftLegDirection).scaleSelf(tLeft).addSelf(leftCutoff);
        this._temp5.copy(this.velocity).subSelf(this._temp4);
        distSqLeft = RVOMath.absSq(this._temp5);
      }
      
      if (tRight < 0.0) {
        distSqRight = Infinity;
      } else {
        this._temp4.copy(rightLegDirection).scaleSelf(tRight).addSelf(rightCutoff);
        this._temp5.copy(this.velocity).subSelf(this._temp4);
        distSqRight = RVOMath.absSq(this._temp5);
      }

      if (distSqCutoff <= distSqLeft && distSqCutoff <= distSqRight) {
        /* Project on cut-off line. */
        line.direction = obstacle1.unitDir.scale(-1);
        var aux = new Vector2D(-line.direction.y, line.direction.x);
        this._temp4.copy(aux).scaleSelf(this.radius * invTimeHorizonObst);
        line.point = this._temp4.plus(leftCutoff);
        orcaLines.push(line)
        continue
      } else if (distSqLeft <= distSqRight) {
        /* Project on left leg. */
        if (isLeftLegForeign) {
          continue
        }

        line.direction = leftLegDirection;
        var aux = new Vector2D(-line.direction.y, line.direction.x);
        this._temp4.copy(aux).scaleSelf(this.radius * invTimeHorizonObst);
        line.point = this._temp4.plus(leftCutoff);
        orcaLines.push(line)
        continue
      } else {
        /* Project on right leg. */
        if (isRightLegForeign) {
          continue
        }

        line.direction = rightLegDirection.scale(-1);
        var aux = new Vector2D(-line.direction.y, line.direction.x);
        this._temp4.copy(aux).scaleSelf(this.radius * invTimeHorizonObst);
        line.point = this._temp4.plus(leftCutoff);
        orcaLines.push(line)
        continue
      }
    }

    var numObstLines = orcaLines.length

    var invTimeHorizon = 1.0 / this.timeHorizon

    /* Create agent ORCA lines. */
    for (var i = 0; i < this.agentNeighbors.length; ++i) {
      var other = this.agentNeighbors[i].value

      // 使用临时向量优化
      this._temp1.copy(other.position).subSelf(this.position);  // relativePosition
      this._temp2.copy(this.velocity).subSelf(other.velocity);  // relativeVelocity
      let relativePosition = this._temp1;
      let relativeVelocity = this._temp2;
      
      let distSq = RVOMath.absSq(relativePosition)
      let combinedRadius = this.radius + other.radius
      let combinedRadiusSq = RVOMath.sqr(combinedRadius)

      var line = new Line(); // Line
      var u: Vector2D;

      if (distSq > combinedRadiusSq) {
        /* No collision. */
        this._temp3.copy(relativePosition).scaleSelf(invTimeHorizon);
        this._temp3.copy(relativeVelocity).subSelf(this._temp3);  // w
        let w = this._temp3;
        
        /* Vector from cutoff center to relative velocity. */
        let wLengthSq = RVOMath.absSq(w)

        let dotProduct1 = w.multiply(relativePosition)

        if (dotProduct1 < 0.0 && RVOMath.sqr(dotProduct1) > combinedRadiusSq * wLengthSq) {
          /* Project on cut-off circle. */
          let wLength = Math.sqrt(wLengthSq);
          let unitW = w.scale(1 / wLength);

          line.direction = new Vector2D(unitW.y, -unitW.x);
          u = unitW.scale(combinedRadius * invTimeHorizon - wLength);
        } else {
          /* Project on legs. */
          let leg = Math.sqrt(distSq - combinedRadiusSq)

          if (RVOMath.det(relativePosition, w) > 0.0) {
            /* Project on left leg. */
            this._temp4.set(
              relativePosition.x * leg - relativePosition.y * combinedRadius, 
              relativePosition.x * combinedRadius + relativePosition.y * leg
            );
            line.direction = this._temp4.scale(1 / distSq);
          } else {
            /* Project on right leg. */
            this._temp4.set(
              relativePosition.x * leg + relativePosition.y * combinedRadius, 
              -relativePosition.x * combinedRadius + relativePosition.y * leg
            );
            line.direction = this._temp4.scale(-1 / distSq);
          }

          let dotProduct2 = relativeVelocity.multiply(line.direction)

          u = line.direction.scale(dotProduct2).minus(relativeVelocity);
        }
      } else {
        /* Collision. Project on cut-off circle of time timeStep. */
        let invTimeStep = 1.0 / this.simulator.timeStep

        /* Vector from cutoff center to relative velocity. */
        this._temp3.copy(relativePosition).scaleSelf(invTimeStep);
        this._temp3.copy(relativeVelocity).subSelf(this._temp3);  // w
        const w = this._temp3;

        let wLength = RVOMath.abs(w);
        let unitW = w.scale(1 / wLength);

        line.direction = new Vector2D(unitW.y, -unitW.x);
        u = unitW.scale(combinedRadius * invTimeStep - wLength);
      }

      line.point = u.scale(0.5).plus(this.velocity);
      orcaLines.push(line)
    }

    let lineFail = this._linearProgram2(orcaLines, this.maxSpeed, this.prefVelocity, false);

    if (lineFail < orcaLines.length) {
      this._linearProgram3(orcaLines, numObstLines, lineFail, this.maxSpeed);
    }
  }

  insertAgentNeighbor(agent: Agent, rangeSq: number) {
    if (this != agent) {
      // 使用临时向量优化
      this._temp1.copy(this.position).subSelf(agent.position);
      var distSq = RVOMath.absSq(this._temp1);

      if (distSq < rangeSq) {
        if (this.agentNeighbors.length < this.maxNeighbors) {
          this.agentNeighbors.push(new KeyValuePair(distSq, agent))
        }
        var i = this.agentNeighbors.length - 1
        while (i != 0 && distSq < this.agentNeighbors[i - 1].key) {
          this.agentNeighbors[i] = this.agentNeighbors[i - 1]
          --i
        }
        this.agentNeighbors[i] = new KeyValuePair(distSq, agent)

        if (this.agentNeighbors.length == this.maxNeighbors) {
          rangeSq = this.agentNeighbors[this.agentNeighbors.length - 1].key
        }
      }
    }
  }

  insertObstacleNeighbor(obstacle: Obstacle, rangeSq: number) {
    let nextObstacle = obstacle.next;

    let distSq = RVOMath.distSqPointLineSegment(obstacle.point, nextObstacle.point, this.position)

    if (distSq < rangeSq) {
      this.obstaclNeighbors.push(new KeyValuePair(distSq, obstacle))

      let i = this.obstaclNeighbors.length - 1
      while (i != 0 && distSq < this.obstaclNeighbors[i - 1].key) {
        this.obstaclNeighbors[i] = this.obstaclNeighbors[i - 1]
        --i
      }
      this.obstaclNeighbors[i] = new KeyValuePair(distSq, obstacle)
    }
  }

  update() {
    // var rnd = new Vector2D(Math.random() * 0.1 - 0.05, Math.random() * 0.1 - 0.05)
    // this.velocity = this.newVelocity.plus(rnd)
    this.velocity = this._newVelocity;
    
    // 使用临时向量优化，避免创建新对象
    this._temp1.copy(this._newVelocity).scaleSelf(this.simulator.timeStep);
    this.position = this.position.plus(this._temp1);
  }

  private _linearProgram1(lines: Line[],
    lineNo: number,
    radius: number,
    optVelocity: Vector2D,
    directionOpt: boolean): boolean {

    var dotProduct = lines[lineNo].point.multiply(lines[lineNo].direction)
    var discriminant = RVOMath.sqr(dotProduct) + RVOMath.sqr(radius) - RVOMath.absSq(lines[lineNo].point)

    if (discriminant < 0.0) {
      /* Max speed circle fully invalidates line lineNo. */
      return false;
    }

    var sqrtDiscriminant = Math.sqrt(discriminant);
    var tLeft = -dotProduct - sqrtDiscriminant;
    var tRight = -dotProduct + sqrtDiscriminant;

    for (var i = 0; i < lineNo; ++i) {
      var denominator = RVOMath.det(lines[lineNo].direction, lines[i].direction);
      
      // 使用临时向量优化
      this._temp1.copy(lines[lineNo].point).subSelf(lines[i].point);
      var numerator = RVOMath.det(lines[i].direction, this._temp1);

      if (Math.abs(denominator) <= RVOMath.RVO_EPSILON) {
        /* Lines lineNo and i are (almost) parallel. */
        if (numerator < 0.0) {
          return false;
        } else {
          continue;
        }
      }

      var t = numerator / denominator;

      if (denominator >= 0.0) {
        /* Line i bounds line lineNo on the right. */
        tRight = Math.min(tRight, t);
      } else {
        /* Line i bounds line lineNo on the left. */
        tLeft = Math.max(tLeft, t);
      }

      if (tLeft > tRight) {
        return false;
      }
    }

    if (directionOpt) {
      if (optVelocity.multiply(lines[lineNo].direction) > 0.0) {
        // Take right extreme
        this._newVelocity = lines[lineNo].direction.scale(tRight).plus(lines[lineNo].point);
      } else {
        // Take left extreme.
        this._newVelocity = lines[lineNo].direction.scale(tLeft).plus(lines[lineNo].point);
      }
    } else {
      // Optimize closest point
      this._temp2.copy(optVelocity).subSelf(lines[lineNo].point);
      t = lines[lineNo].direction.multiply(this._temp2);

      if (t < tLeft) {
        this._newVelocity = lines[lineNo].direction.scale(tLeft).plus(lines[lineNo].point);
      } else if (t > tRight) {
        this._newVelocity = lines[lineNo].direction.scale(tRight).plus(lines[lineNo].point);
      } else {
        this._newVelocity = lines[lineNo].direction.scale(t).plus(lines[lineNo].point);
      }
    }

    // TODO ugly hack by palmerabollo
    if (isNaN(this._newVelocity.x) || isNaN(this._newVelocity.y)) {
      return false;
    }

    return true;
  }

  private _linearProgram2(lines: Line[],
    radius: number,
    optVelocity: Vector2D,
    directionOpt: boolean): number {
    if (directionOpt) {
      /*
       * Optimize direction. Note that the optimization velocity is of unit
       * length in this case.
       */
      this._newVelocity = optVelocity.scale(radius);
    } else if (RVOMath.absSq(optVelocity) > RVOMath.sqr(radius)) {
      /* Optimize closest point and outside circle. */
      this._newVelocity = RVOMath.normalize(optVelocity).scale(radius);
    } else {
      /* Optimize closest point and inside circle. */
      this._newVelocity = optVelocity;
    }

    for (var i = 0; i < lines.length; ++i) {
      // 使用临时向量优化
      this._temp3.copy(lines[i].point).subSelf(this._newVelocity);
      if (RVOMath.det(lines[i].direction, this._temp3) > 0.0) {
        /* Result does not satisfy constraint i. Compute new optimal result. */
        var tempResult = this._newVelocity;
        if (!this._linearProgram1(lines, i, this.radius, optVelocity, directionOpt)) {
          this._newVelocity = tempResult;
          return i;
        }
      }
    }

    return lines.length;
  }

  private _linearProgram3(lines: Line[], numObstLines: number, beginLine: number, radius: number) {
    var distance = 0.0;

    for (var i = beginLine; i < lines.length; ++i) {
      // 使用临时向量优化
      this._temp4.copy(lines[i].point).subSelf(this._newVelocity);
      if (RVOMath.det(lines[i].direction, this._temp4) > distance) {
        /* Result does not satisfy constraint of line i. */
        //std::vector<Line> projLines(lines.begin(), lines.begin() + numObstLines)
        let projLines = []; // new List<Line>()
        for (var ii = 0; ii < numObstLines; ++ii) {
          projLines.push(lines[ii]);
        }

        for (var j = numObstLines; j < i; ++j) {
          var line = new Line();

          let determinant = RVOMath.det(lines[i].direction, lines[j].direction);

          if (Math.abs(determinant) <= RVOMath.RVO_EPSILON) {
            /* Line i and line j are parallel. */
            if (lines[i].direction.multiply(lines[j].direction) > 0.0) {
              /* Line i and line j point in the same direction. */
              continue;
            } else {
              /* Line i and line j point in opposite direction. */
              this._temp5.copy(lines[i].point).addSelf(lines[j].point);
              line.point = this._temp5.scale(0.5);
            }
          } else {
            this._temp5.copy(lines[i].point).subSelf(lines[j].point);
            var aux = lines[i].direction.scale(RVOMath.det(lines[j].direction, this._temp5) / determinant);
            line.point = lines[i].point.plus(aux);
          }

          this._temp5.copy(lines[j].direction).subSelf(lines[i].direction);
          line.direction = RVOMath.normalize(this._temp5);
          projLines.push(line);
        }

        var tempResult = this._newVelocity;
        this._temp5.set(-lines[i].direction.y, lines[i].direction.x);
        if (this._linearProgram2(projLines, radius, this._temp5, true) < projLines.length) {
          /* This should in principle not happen.  The result is by definition
           * already in the feasible region of this linear program. If it fails,
           * it is due to small floating point error, and the current result is
           * kept.
           */
          this._newVelocity = tempResult;
        }

        this._temp4.copy(lines[i].point).subSelf(this._newVelocity);
        distance = RVOMath.det(lines[i].direction, this._temp4);
      }
    }
  }
}


class KeyValuePair {
  key;
  value;

  constructor(key, value) {
    this.key = key
    this.value = value
  }
}

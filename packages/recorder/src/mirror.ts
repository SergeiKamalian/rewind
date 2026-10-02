/**
 * Stable numeric ids for DOM nodes in one recording session.
 *
 * Ids start at 1 and are never reused, even after a node is removed.
 */
export class Mirror {
  /**
   * Returns the id for `node`, assigning the next free id on first sight.
   */
  getId(node: Node): number {
    void node;
    throw new Error("not implemented");
  }

  /**
   * Returns the node for `id`, or `undefined` when it is not in the mirror.
   */
  getNode(id: number): Node | undefined {
    void id;
    throw new Error("not implemented");
  }

  /**
   * Whether `node` currently has an id in this mirror.
   */
  has(node: Node): boolean {
    void node;
    throw new Error("not implemented");
  }

  /**
   * Drops `node` from the mirror. Its id is not given to another node.
   */
  remove(node: Node): void {
    void node;
    throw new Error("not implemented");
  }
}

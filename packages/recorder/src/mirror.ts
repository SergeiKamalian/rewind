/**
 * Stable numeric ids for DOM nodes in one recording session.
 *
 * Node to id uses a `WeakMap`, so the mirror does not keep a node alive
 * after the page drops it. Id to node uses a `WeakRef` for the same reason.
 * Ids start at 1 and are never reused. See ADR 0010.
 */
export class Mirror {
  private readonly nodeToId = new WeakMap<Node, number>();
  private readonly idToNode = new Map<number, WeakRef<Node>>();
  /**
   * Drops the id-to-node entry when the node is collected.
   * The held value is the id, never the node, so the callback cannot
   * keep the node alive. Ids are not reused, so a late callback cannot
   * clear a newer node.
   */
  private readonly collected = new FinalizationRegistry<number>((id) => {
    this.idToNode.delete(id);
  });
  private nextId = 1;

  /**
   * Returns the id for `node`, assigning the next free id on first sight.
   */
  getId(node: Node): number {
    const existing = this.nodeToId.get(node);
    if (existing !== undefined) {
      return existing;
    }

    const id = this.nextId;
    this.nextId += 1;
    this.nodeToId.set(node, id);
    this.idToNode.set(id, new WeakRef(node));
    this.collected.register(node, id);
    return id;
  }

  /**
   * Returns the node for `id`, or `undefined` when it was removed or collected.
   */
  getNode(id: number): Node | undefined {
    const ref = this.idToNode.get(id);
    if (ref === undefined) {
      return undefined;
    }

    const node = ref.deref();
    if (node === undefined) {
      this.idToNode.delete(id);
      return undefined;
    }

    return node;
  }

  /**
   * Whether `node` currently has an id in this mirror.
   */
  has(node: Node): boolean {
    return this.nodeToId.has(node);
  }

  /**
   * Drops `node` from the mirror. Its id is not given to another node.
   */
  remove(node: Node): void {
    const id = this.nodeToId.get(node);
    if (id === undefined) {
      return;
    }

    this.nodeToId.delete(node);
    this.idToNode.delete(id);
  }
}
